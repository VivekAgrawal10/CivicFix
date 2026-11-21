const WorkOrder = require('../models/WorkOrder');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { emitToUser } = require('../config/socket');
const { sendPushNotification } = require('../utils/fcm');
const { notifyAdmins } = require('../services/notify');
const { resolveReport } = require('../services/resolution');
const Admin = require('../models/Admin');

const notifyUser = async (recipientId, type, title, message, relatedReport = null) => {
  try {
    const notification = await Notification.create({ recipient: recipientId, type, title, message, relatedReport });
    emitToUser(recipientId.toString(), 'notification', notification);

    const fcmToken = await User.fcmToken(recipientId);
    if (fcmToken) {
      await sendPushNotification(fcmToken, title, message, { type });
    }
  } catch (err) {
    console.error('notifyUser error:', err.message);
  }
};

// POST /api/v1/workorders — admin creates
const createWorkOrder = async (req, res, next) => {
  try {
    const { report: reportId, assignedContractor, priority, scheduledDate, notes } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const workOrder = await WorkOrder.create({
      report: reportId,
      assignedContractor,
      priority: priority || report.priority,
      scheduledDate,
      notes,
      createdBy: req.user._id,
    });

    // Link work order to report and update status
    // assignedTo is derived from the newest work order of the report; only the status changes here
    await Report.update(reportId, { status: 'assigned' }, { changedBy: req.user._id, remarks: 'Work order created' });

    if (assignedContractor) {
      await notifyUser(
        assignedContractor,
        'work_order',
        'New Work Order Assigned',
        `You have been assigned a new work order for report: ${report.title}.`,
        reportId
      );
    }

    await WorkOrder.populate(workOrder, { report: true, assignedContractor: true, createdBy: true });
    res.status(201).json({ success: true, message: 'Work order created.', data: workOrder });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/workorders
const getWorkOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};

    if (req.user.role === 'contractor') {
      filter.assignedContractor = req.user._id;
    }
    if (req.query.status) filter.status = req.query.status;

    const [workOrders, total] = await Promise.all([
      WorkOrder.list({ filter, skip, limit }),
      WorkOrder.count(filter),
    ]);
    await WorkOrder.populate(workOrders, { report: ['title', 'category', 'status', 'priority', 'address', 'images', 'location'], assignedContractor: ['name', 'email', 'phone'] });

    res.json({ success: true, data: workOrders, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/workorders/:id
const getWorkOrderById = async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id);
    if (workOrder) {
      await WorkOrder.populate(workOrder, { report: true, assignedContractor: ['name', 'email', 'phone'], createdBy: ['name', 'email'] });
    }

    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found.' });
    }

    if (
      req.user.role !== 'admin' &&
      workOrder.assignedContractor?._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: workOrder });
  } catch (error) {
    next(error);
  }
};

// Allowed moves. Contractors can start and finish a job; only an admin can verify it (that is what pays the reporter),
// or send a finished job back for more work.
const NEXT = { open: ['in_progress', 'completed'], in_progress: ['completed', 'open'], completed: ['in_progress', 'verified'], verified: [] };

// PATCH /api/v1/workorders/:id/status   { status, note?, force? }
const updateWorkOrderStatus = async (req, res, next) => {
  try {
    const { status, note, force } = req.body;
    const validStatuses = ['open', 'in_progress', 'completed', 'verified'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const isAdmin = req.user.role === 'admin';

    let workOrder = await WorkOrder.findById(req.params.id);
    if (workOrder) await WorkOrder.populate(workOrder, { report: true });
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found.' });
    }
    if (!isAdmin && workOrder.assignedContractor?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (!isAdmin && status === 'verified') {
      return res.status(403).json({ success: false, message: 'Only an admin can verify completed work.' });
    }
    if (!isAdmin && workOrder.status === 'completed') {
      return res.status(409).json({ success: false, message: 'This job is finished and waiting for admin verification.' });
    }
    if (!NEXT[workOrder.status].includes(status)) {
      return res.status(409).json({ success: false, message: `A work order that is "${workOrder.status}" cannot move to "${status}".` });
    }
    if (status === 'completed' && !(isAdmin && force) && (workOrder.repairEvidence || []).length === 0) {
      return res.status(400).json({ success: false, message: 'Upload at least one "after" photo as proof before marking the job complete.' });
    }

    const report = workOrder.report;
    const stamp = `[${new Date().toISOString().slice(0, 10)} ${status}] ${String(note || '').trim()}`.trim();
    const patch = { status, ...(status === 'completed' ? { completedDate: new Date() } : {}), ...(status === 'in_progress' || status === 'open' ? { completedDate: null } : {}) };
    if (note && String(note).trim()) patch.notes = `${workOrder.notes || ''}${workOrder.notes ? '\n' : ''}${stamp}`;
    workOrder = await WorkOrder.update(workOrder._id, patch);
    workOrder.report = report;

    let pointsAwarded = 0;
    if (status === 'in_progress' && report.status !== 'in_progress') {
      await Report.update(report._id, { status: 'in_progress' }, { changedBy: req.user._id, remarks: 'Repair work started' });
    } else if (status === 'completed') {
      await notifyAdmins('Job finished — please verify', `"${report.title}" was marked complete with ${(workOrder.repairEvidence || []).length} photo(s).`, report._id);
      await notifyUser(report.submittedBy, 'work_order', 'Repair finished', `The repair for "${report.title}" is finished and is being verified.`, report._id);
    } else if (status === 'verified') {
      // Verified = the repair is real: report resolved, reporter's pending +25 released, +50 "issue fixed" paid once
      const out = await resolveReport(report._id, { adminId: req.user._id, remarks: 'Work order verified' });
      pointsAwarded = out.points || 0;
    }
    if (isAdmin) {
      await Admin.log({ adminId: req.user._id, action: `workorder_${status}`, entityType: 'workorder', entityId: workOrder._id, details: `${report.title}${pointsAwarded ? ` (+${pointsAwarded} CivicCreds to reporter)` : ''}` });
    }

    emitToUser(String(report.submittedBy), 'report_update', { reportId: report._id, workOrderStatus: status });
    res.json({ success: true, message: 'Work order status updated.', data: workOrder, pointsAwarded });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/workorders/:id/evidence
const uploadEvidence = async (req, res, next) => {
  try {
    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) {
      return res.status(404).json({ success: false, message: 'Work order not found.' });
    }

    if (
      req.user.role !== 'admin' &&
      workOrder.assignedContractor?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    let urls = (req.files || []).map((f) => {
      if (f.secure_url) return f.secure_url;
      if (f.path && f.path.startsWith('http')) return f.path;
      if (f.filename) return `/uploads/${f.filename}`;
      return f.path;
    });

    if (urls.length === 0 && req.body.images) {
      urls = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    } else if (urls.length === 0 && req.body.repairEvidence) {
      urls = Array.isArray(req.body.repairEvidence) ? req.body.repairEvidence : [req.body.repairEvidence];
    }

    if (urls.length === 0) {
      return res.status(400).json({ success: false, message: 'No files or image URLs provided.' });
    }

    const updated = await WorkOrder.addEvidence(workOrder._id, urls);

    res.json({ success: true, message: 'Evidence uploaded.', data: { repairEvidence: updated.repairEvidence } });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/workorders/contractor/:contractorId — admin only
const getWorkOrdersByContractor = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { assignedContractor: req.params.contractorId };

    const [workOrders, total] = await Promise.all([
      WorkOrder.list({ filter, skip, limit }),
      WorkOrder.count(filter),
    ]);
    await WorkOrder.populate(workOrders, { report: ['title', 'category', 'status', 'priority', 'address'] });

    res.json({ success: true, data: workOrders, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkOrder,
  getWorkOrders,
  getWorkOrderById,
  updateWorkOrderStatus,
  uploadEvidence,
  getWorkOrdersByContractor,
};
