const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/report.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Specific routes before parameterized
router.get('/nearby', auth, getNearbyReports);
router.get('/my', auth, getMyReports);
router.get('/priority-queue', auth, authorize('admin'), getPriorityQueue);
router.get('/duplicates', auth, authorize('admin'), getDuplicateReports);
router.get('/map', auth, getMapReports);
router.post('/pre-check', auth, preCheckReport);

router.post('/', auth, authorize('citizen', 'admin'), createReport);
router.get('/', auth, getReports);
router.get('/:id', auth, getReportById);
router.patch('/:id/status', auth, authorize('admin'), updateReportStatus);
router.patch('/:id/priority', auth, authorize('admin'), updateReportPriority);
router.post('/:id/upvote', auth, toggleUpvote);
router.post('/:id/confirm', auth, confirmReport);
router.post('/:id/duplicate', auth, authorize('admin'), markAsDuplicate);
router.delete('/:id', auth, authorize('admin'), deleteReport);

module.exports = router;
