const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getSegments,
  getAnalytics,
  getHeatmap,
  addSegment,
  assessSafeRoute,
} = require('../controllers/roadhealth.controller');

// GET /api/v1/roadhealth/segments — list road segments with health scores
router.get('/segments', protect, getSegments);

// GET /api/v1/roadhealth/analytics — aggregate data for admin analytics
router.get('/analytics', protect, authorize('admin'), getAnalytics);

// GET /api/v1/roadhealth/heatmap?bounds=sw_lat,sw_lng,ne_lat,ne_lng — heatmap data
router.get('/heatmap', protect, getHeatmap);

// POST /api/v1/roadhealth/safe-route — check hazards along route corridor
router.post('/safe-route', protect, assessSafeRoute);

// POST /api/v1/roadhealth/segment — admin: add/update road segment
router.post('/segment', protect, authorize('admin'), addSegment);

module.exports = router;
