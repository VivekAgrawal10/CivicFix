const RoadSegment = require('../models/RoadSegment');
const Report = require('../models/Report');
const { computeSafeRoute } = require('../utils/googleMaps');
const { getRoadHealthMetricsFromView } = require('../services/mysqlService');

/**
 * @desc    Get all road segments with health scores
 * @route   GET /api/v1/roadhealth/segments
 * @access  Private
 */
const getSegments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const skip = (page - 1) * limit;
    const segments = await RoadSegment.list({ status, skip, limit }); // worst first
    const total = await RoadSegment.count({ status });

    // For each segment, recalculate health score from recent reports
    const enriched = await Promise.all(
      segments.map(async (seg) => {
        const first = seg.location.coordinates[0]; // use first point [lng, lat]
        const recentReports = first
          ? await Report.countNearby({
              lat: first[1],
              lng: first[0],
              radiusM: 100, // 100 metres radius
              filter: { createdSince: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            })
          : 0;

        // Simple health score decay: -5 per recent report, min 0
        const dynamicScore = Math.max(0, seg.healthScore - recentReports * 5);

        return {
          _id: seg._id,
          name: seg.name,
          location: seg.location,
          healthScore: dynamicScore,
          lastInspected: seg.lastInspected,
          reportCount: seg.reportCount + recentReports,
          dominantIssue: seg.dominantIssue,
          status: seg.status,
          updatedAt: seg.updatedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enriched.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get aggregate analytics for road health
 * @route   GET /api/v1/roadhealth/analytics
 * @access  Private/Admin
 */
const getAnalytics = async (req, res, next) => {
  try {
    const statusGroups = await RoadSegment.statusGroups();
    const overallAvg = await RoadSegment.overall();
    const dominantIssues = await RoadSegment.dominantIssues(5);

    let mysqlMetrics = null;
    try {
      mysqlMetrics = await getRoadHealthMetricsFromView();
    } catch (_) {}

    res.status(200).json({
      success: true,
      data: {
        byStatus: statusGroups,
        overall: overallAvg || {
          avgHealthScore: 0,
          totalSegments: 0,
          totalReports: 0,
        },
        topIssues: dominantIssues,
        localityMetrics: mysqlMetrics || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get heatmap data points
 * @route   GET /api/v1/roadhealth/heatmap?bounds=sw_lat,sw_lng,ne_lat,ne_lng
 * @access  Private
 */
const getHeatmap = async (req, res, next) => {
  try {
    const { bounds } = req.query;
    let box = null;

    if (bounds) {
      const parts = String(bounds).split(',').map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        const [swLat, swLng, neLat, neLng] = parts;
        box = { minLat: swLat, maxLat: neLat, minLng: swLng, maxLng: neLng };
      }
    }

    // Pull from Reports for dense real-time data
    const reports = await Report.heatmapGroups(box);

    const heatmapPoints = reports.map((r) => ({
      lat: r.lat,
      lng: r.lng,
      weight: r.weight,
    }));

    res.status(200).json({
      success: true,
      count: heatmapPoints.length,
      data: heatmapPoints,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add or update a road segment (upsert by name)
 * @route   POST /api/v1/roadhealth/segment
 * @access  Private/Admin
 */
const addSegment = async (req, res, next) => {
  try {
    const {
      name,
      location,
      healthScore,
      lastInspected,
      dominantIssue,
      status,
    } = req.body;

    const segment = await RoadSegment.upsertByName({
      name,
      location,
      healthScore,
      lastInspected,
      dominantIssue,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Road segment saved',
      data: segment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Assess route safety by finding civic hazards along origin/destination corridor
 * @route   POST /api/v1/roadhealth/safe-route
 * @access  Private
 * @body    { origin: { lat, lng }, destination: { lat, lng } }
 */
const assessSafeRoute = async (req, res, next) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination || origin.lat === undefined || destination.lat === undefined) {
      return res.status(400).json({
        success: false,
        message: 'origin ({lat, lng}) and destination ({lat, lng}) are required.',
      });
    }

    const minLat = Math.min(Number(origin.lat), Number(destination.lat)) - 0.02;
    const maxLat = Math.max(Number(origin.lat), Number(destination.lat)) + 0.02;
    const minLng = Math.min(Number(origin.lng), Number(destination.lng)) - 0.02;
    const maxLng = Math.max(Number(origin.lng), Number(destination.lng)) + 0.02;

    const hazards = await Report.list({
      filter: { statusIn: Report.ACTIVE, box: { minLat, maxLat, minLng, maxLng } },
      limit: 1000,
      select: ['title', 'category', 'priority', 'location', 'address', 'description', 'createdAt'],
    });

    let safetyScore = 100;
    hazards.forEach((h) => {
      if (h.priority === 'critical') safetyScore -= 20;
      else if (h.priority === 'high') safetyScore -= 10;
      else safetyScore -= 5;
    });
    safetyScore = Math.max(10, Math.min(100, safetyScore));

    let safetyLevel = 'Good';
    if (safetyScore < 50) safetyLevel = 'Hazardous';
    else if (safetyScore < 80) safetyLevel = 'Moderate Caution';

    const routeInfo = await computeSafeRoute(origin, destination);

    res.json({
      success: true,
      data: {
        safetyScore,
        safetyLevel,
        hazardCount: hazards.length,
        hazards,
        corridor: { minLat, maxLat, minLng, maxLng },
        route: routeInfo,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSegments, getAnalytics, getHeatmap, addSegment, assessSafeRoute };
