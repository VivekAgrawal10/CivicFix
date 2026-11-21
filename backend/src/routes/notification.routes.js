const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  broadcastAlert,
  getCivicAlerts,
} = require('../controllers/notification.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/alerts', auth, getCivicAlerts);
router.post('/broadcast-alert', auth, authorize('admin'), broadcastAlert);
router.get('/', auth, getNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.patch('/read-all', auth, markAllAsRead);
router.patch('/:id/read', auth, markAsRead);

module.exports = router;
