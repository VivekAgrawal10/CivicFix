const Report = require('../models/Report');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { emitToUser } = require('../config/socket');
const { sendPushNotification } = require('../utils/fcm');
const { getUnresolvedIssuesFromView } = require('../services/mysqlService');
const { awardCivicCreds } = require('../utils/civicCreds');
const { analyzeImageUrl } = require('../services/aiClient');
const { resolveReport } = require('../services/resolution');
const { notifyAdmins } = require('../services/notify');

// Grant the one-time submit reward only after independent verification (community confirm or admin triage)
const grantPendingSubmitReward = async (report) => {
  if (!report.rewardPending || report.rewardGranted) return null;
  // Atomic claim: only one concurrent caller wins, so the reward can never be granted twice
  if (!(await Report.claimSubmitReward(report._id))) return null;
  report.rewardGranted = true;
  report.rewardPending = false;
  return awardCivicCreds(report.submittedBy, 'SUBMIT_REPORT', `Verified report: ${report.title}`);
};

// Helper: create notification + push
const notifyUser = async (recipientId, type, title, message, relatedReport = null) => {
  try {
    const notification = await Notification.create({ recipient: recipientId, type, title, message, relatedReport });
    emitToUser(recipientId.toString(), 'notification', notification);

    const fcmToken = await User.fcmToken(recipientId);
    if (fcmToken) {
      await sendPushNotification(fcmToken, title, message, { type, reportId: relatedReport ? relatedReport.toString() : '' });
    }
  } catch (err) {
    console.error('notifyUser error:', err.message);
  }
};

// POST /api/v1/reports
const atLeastHigh = (p) => (p === 'critical' ? 'critical' : 'high');

const createReport = async (req, res, next) => {
  try {
    const { title, description, originalLanguage, category, priority, location, address, images, latitude, longitude, priorityZone } = req.body;
    if (priorityZone && !Report.PRIORITY_ZONES.includes(priorityZone)) {
      return res.status(400).json({ success: false, message: 'priorityZone must be "school" or "hospital".' });
    }

    // Normalise location to GeoJSON Point { type: 'Point', coordinates: [lng, lat] }
    let formattedLocation = { type: 'Point', coordinates: [76.7794, 30.7333] };

    if (location && location.type === 'Point' && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      formattedLocation = location;
    } else if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      formattedLocation = { type: 'Point', coordinates: [parseFloat(location.coordinates[0]), parseFloat(location.coordinates[1])] };
    } else if (location && (location.lat !== undefined || location.latitude !== undefined)) {
      const lat = parseFloat(location.lat !== undefined ? location.lat : location.latitude);
      const lng = parseFloat(location.lng !== undefined ? location.lng : location.longitude);
      formattedLocation = { type: 'Point', coordinates: [lng, lat] };
    } else if (latitude !== undefined && longitude !== undefined) {
      formattedLocation = { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] };
    } else if (Array.isArray(location) && location.length === 2) {
      formattedLocation = { type: 'Point', coordinates: [parseFloat(location[0]), parseFloat(location[1])] };
    }

    // ── AI image screening (server-side, authoritative) ──────────────────────
    const imageList = Array.isArray(images) ? images.filter(Boolean) : [];
    let ai = null;
    if (imageList.length > 0) {
      const [lng, lat] = formattedLocation.coordinates;
      const nearbyHashes = await Report.hashesNear(lat, lng, 150, 20);
      ai = await analyzeImageUrl(imageList[0], nearbyHashes);

      if (ai.rejected) {
        return res.status(422).json({
          success: false,
          code: ai.rejectionCode || 'NON_CIVIC_IMAGE',
          message: ai.message || 'This image does not look like a civic issue. Please upload a clear photo of the problem.',
          aiAnalysis: ai,
        });
      }
      if (!ai.available && process.env.AI_STRICT === 'true') {
        return res.status(503).json({ success: false, message: ai.message, aiAnalysis: ai });
      }
    }
    const manualReview = !ai || ai.manualReviewRequired || !ai.available;

    const report = await Report.create({
      title,
      description,
      originalLanguage: originalLanguage || 'en',
      category: category || (ai && ai.category) || 'other',
      // near a school or hospital: never below "high", and it appears in the admin's priority list
      priority: priorityZone ? atLeastHigh(priority || (ai && ai.severity) || 'medium') : (priority || (ai && ai.severity) || 'medium'),
      priorityZone: priorityZone || null,
      location: formattedLocation,
      address: address || '',
      images: imageList,
      submittedBy: req.user._id,
      confirmationCount: 1,
      priorityScore: priorityZone ? 40 : 15,
      rewardPending: true,
      aiAnalysis: ai
        ? {
            severity: ai.severity,
            category: ai.category,
            confidence: ai.confidence,
            outcome: ai.outcome,
            manualReviewRequired: manualReview,
            relevanceStatus: ai.relevanceStatus || null,
            method: ai.method || null,
            message: ai.message || null,
            imageHash: ai.imageHash || null,
            analyzedAt: new Date(),
            isDuplicate: Boolean(ai.duplicateCandidate),
          }
        : { outcome: 'no_image', manualReviewRequired: true },
    });

    await Report.populate(report, { submittedBy: ['name', 'email'] });
    if (priorityZone) {
      await notifyAdmins('Priority report: near a ' + priorityZone, `"${report.title}" was reported near a ${priorityZone}.`, report._id);
    }

    res.status(201).json({
      success: true,
      message: `Report created. ${manualReview ? 'It is queued for manual review. ' : ''}+25 🪙 CivicCreds will be awarded once the report is independently verified.`,
      data: report,
      aiAnalysis: ai,
      reward: { pending: true, amount: 25 },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/reports
const getReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.priority) filter.priority = req.query.priority;

    const [reports, total] = await Promise.all([
      Report.list({ filter, skip, limit }),
      Report.count(filter),
    ]);
    await Report.populate(reports, { submittedBy: ['name', 'email', 'avatar'] });

    res.json({ success: true, data: reports, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/reports/nearby?lat=&lng=&radius=
const getNearbyReports = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // radius in meters, default 5km

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng query parameters are required.' });
    }

    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const radiusN = parseInt(radius, 10);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN) || !Number.isFinite(radiusN) || radiusN < 0) {
      return res.status(400).json({ success: false, message: 'lat, lng and radius must be valid numbers.' });
    }

    const reports = await Report.nearby({ lat: latN, lng: lngN, radiusM: radiusN, limit: 50 });
    await Report.populate(reports, { submittedBy: ['name', 'email'] });

    res.json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/reports/my
const getMyReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { submittedBy: req.user._id };

    const [reports, total] = await Promise.all([
      Report.list({ filter, skip, limit }),
      Report.count(filter),
    ]);

    res.json({ success: true, data: reports, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/reports/:id
const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    await Report.populate(report, { submittedBy: ['name', 'email', 'avatar'], assignedTo: true, duplicateOf: ['title', 'status'] });

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/reports/:id/status — admin only
const updateReportStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    // Resolving pays the reporter (+50, once) and releases the pending +25, exactly like a verified work order
    if (status === 'resolved') {
      const out = await resolveReport(req.params.id, { adminId: req.user._id, remarks: 'Status set to resolved by admin' });
      if (!out.ok) return res.status(out.code).json({ success: false, message: out.message });
      return res.json({ success: true, message: out.already ? 'Report was already resolved.' : 'Report resolved.', data: out.report, pointsAwarded: out.points });
    }

    const report = await Report.update(req.params.id, { status }, { changedBy: req.user._id, remarks: `Status set to ${status} by admin` });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    // Admin triage (anything past 'pending') counts as independent verification
    if (status !== 'pending') await grantPendingSubmitReward(report);

    // Notify submitter
    await notifyUser(
      report.submittedBy,
      'report_update',
      'Report Status Updated',
      `Your report "${report.title}" status changed to ${status}.`,
      report._id
    );

    // Emit socket event
    emitToUser(report.submittedBy.toString(), 'report_update', { reportId: report._id, status });

    res.json({ success: true, message: 'Report status updated.', data: report });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/reports/:id/priority — admin only
const updateReportPriority = async (req, res, next) => {
  try {
    const { priority } = req.body;
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value.' });
    }

    const report = await Report.update(req.params.id, { priority });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    res.json({ success: true, message: 'Report priority updated.', data: report });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/reports/:id/upvote — toggle upvote
const toggleUpvote = async (req, res, next) => {
  try {
    const result = await Report.toggleUpvote(req.params.id, req.user._id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    res.json({ success: true, upvotes: result.upvotes, upvoted: result.upvoted });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/reports/:id — admin only
const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.delete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    res.json({ success: true, message: 'Report deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/reports/priority-queue — admin only
const getPriorityQueue = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [reports, total] = await Promise.all([
      Report.priorityQueue({ skip, limit }),
      Report.count({ statusIn: Report.ACTIVE }),
    ]);

    await Report.populate(reports, { submittedBy: ['name', 'email', 'avatar'], assignedTo: true });

    let mysqlIssues = null;
    try {
      mysqlIssues = await getUnresolvedIssuesFromView();
    } catch (_) {}

    res.json({
      success: true,
      data: reports,
      pagination: getPaginationMeta(total, page, limit),
      unresolvedIssuesView: mysqlIssues || [],
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/reports/duplicates — admin only
const getDuplicateReports = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { aiDuplicate: true };

    const [reports, total] = await Promise.all([
      Report.list({ filter, skip, limit }),
      Report.count(filter),
    ]);
    await Report.populate(reports, { submittedBy: ['name', 'email'], duplicateOf: ['title', 'status', 'category', 'address'] });

    res.json({ success: true, data: reports, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/reports/map — live map & monitoring
const getMapReports = async (req, res, next) => {
  try {
    const { sw_lat, sw_lng, ne_lat, ne_lng, category, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.statusIn = Report.ACTIVE;
    }

    if (category) filter.category = category;

    if (sw_lat && sw_lng && ne_lat && ne_lng) {
      filter.box = { minLat: parseFloat(sw_lat), maxLat: parseFloat(ne_lat), minLng: parseFloat(sw_lng), maxLng: parseFloat(ne_lng) };
    }

    const reports = await Report.list({
      filter,
      limit: 250,
      select: ['title', 'category', 'priority', 'status', 'location', 'address', 'createdAt', 'images', 'upvotes', 'submittedBy'],
    });
    await Report.populate(reports, { submittedBy: ['name'] });

    res.json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/reports/:id/duplicate — mark duplicate
const markAsDuplicate = async (req, res, next) => {
  try {
    const { duplicateOf, confidence } = req.body;
    if (!duplicateOf) {
      return res.status(400).json({ success: false, message: 'duplicateOf report ID is required.' });
    }

    const originalReport = await Report.findById(duplicateOf);
    if (!originalReport) {
      return res.status(404).json({ success: false, message: 'Original report not found.' });
    }

    const report = await Report.update(req.params.id, {
      aiAnalysis: { isDuplicate: true, duplicateOf, confidence: confidence || 0.9 },
    });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    res.json({ success: true, message: 'Report marked as duplicate.', data: report });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/reports/pre-check — Check for active nearby issues before submission
const preCheckReport = async (req, res, next) => {
  try {
    const { latitude, longitude, category } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.json({ success: true, hasExistingIssueNearby: false });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Search for active reports within 60 meters
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.json({ success: true, hasExistingIssueNearby: false });
    }
    const nearbyReports = await Report.nearby({ lat, lng, radiusM: 60, filter: { statusIn: Report.ACTIVE }, limit: 3 });

    if (nearbyReports.length > 0) {
      const existing = nearbyReports[0];
      return res.json({
        success: true,
        hasExistingIssueNearby: true,
        existingReport: {
          _id: existing._id,
          title: existing.title,
          category: existing.category,
          address: existing.address,
          priority: existing.priority,
          confirmationCount: existing.confirmationCount || 1,
          createdAt: existing.createdAt,
        },
        alertPopup: {
          title: '🚨 Existing Issue Already Reported Nearby!',
          message: `A similar active ${existing.category} report was already logged within 60 meters. Submitting duplicate complaints slows down repair teams. Would you like to confirm and vouch for this issue instead?`,
          incentive: 'Vouching escalates priority rank immediately and awards you +15 🪙 CivicCreds!',
          warning: 'Filing false or duplicate calls may reduce your CivicScore reputation.',
          actionConfirm: {
            text: 'Confirm & Vouch (+15 🪙 CivicCreds)',
            endpoint: `/api/v1/reports/${existing._id}/confirm`,
            method: 'POST',
            reportId: existing._id,
          },
          actionProceed: {
            text: 'This is a Distinct Issue (Submit Anyway)',
          },
        },
      });
    }

    return res.json({ success: true, hasExistingIssueNearby: false });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/reports/:id/confirm — Citizen vouches for existing issue
const confirmReport = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const outcome = await Report.confirm(req.params.id, userId, req.body.remarks);

    if (outcome.status === 'not_found') {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }
    if (outcome.status === 'own') {
      return res.status(400).json({ success: false, message: 'You cannot confirm your own report.' });
    }
    if (outcome.status === 'duplicate') {
      return res.status(400).json({ success: false, message: 'You have already confirmed and vouched for this issue.' });
    }
    const report = outcome.report;

    // A second, different citizen confirming is independent verification of the original report
    await grantPendingSubmitReward(report);

    // Reward user with +15 CivicCreds
    const rewardInfo = await awardCivicCreds(
      userId,
      'CONFIRM_ISSUE',
      `Confirmed active issue: ${report.title}`
    );

    // Live Socket.io update to submitter & admins
    emitToUser(report.submittedBy.toString(), 'report_update', {
      reportId: report._id,
      confirmationCount: report.confirmationCount,
      priority: report.priority,
    });

    res.json({
      success: true,
      message: 'Thank you for confirming! Your community verification escalates priority for faster resolution.',
      reward: rewardInfo,
      report: {
        _id: report._id,
        title: report.title,
        priority: report.priority,
        confirmationCount: report.confirmationCount,
        priorityScore: report.priorityScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getReports,
  getNearbyReports,
  getMyReports,
  getReportById,
  updateReportStatus,
  updateReportPriority,
  toggleUpvote,
  deleteReport,
  getPriorityQueue,
  getDuplicateReports,
  getMapReports,
  markAsDuplicate,
  preCheckReport,
  confirmReport,
};
