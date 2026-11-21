const Notification = require('../models/Notification');
const User = require('../models/User');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { emitCivicAlert } = require('../utils/socketEvents');
const { sendPushNotification } = require('../utils/fcm');

// GET /api/v1/notifications
const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { recipient: req.user._id };

    const [notifications, total] = await Promise.all([
      Notification.list({ recipient: req.user._id, skip, limit }),
      Notification.count({ recipient: req.user._id }),
    ]);
    await Notification.populateReport(notifications, ['title', 'status']);

    res.json({ success: true, data: notifications, pagination: getPaginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({ recipient: req.user._id, isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.markRead(req.params.id, req.user._id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Notification marked as read.', data: notification });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    const updatedCount = await Notification.markAllRead(req.user._id);

    res.json({ success: true, message: 'All notifications marked as read.', updatedCount });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/notifications/broadcast-alert — admin only
const broadcastAlert = async (req, res, next) => {
  try {
    const { title, message, severity, area, relatedReport } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required for civic alerts.' });
    }

    const users = await User.activeRecipients();

    const notifDocs = users.map((u) => ({
      recipient: u._id,
      type: 'civic_alert',
      title: `🚨 ${title}`,
      message,
      relatedReport: relatedReport || null,
    }));

    if (notifDocs.length > 0) {
      await Notification.insertMany(notifDocs);
    }

    emitCivicAlert({ title, message, severity: severity || 'high', area: area || 'Citywide' });

    users
      .filter((u) => u.fcmToken)
      .forEach((u) => {
        sendPushNotification(u.fcmToken, `🚨 CivicAlert: ${title}`, message, { type: 'civic_alert' }).catch(() => {});
      });

    res.status(201).json({
      success: true,
      message: `CivicAlert broadcast to ${users.length} citizens.`,
      alert: { title, message, severity, area },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/notifications/alerts — get civic alerts
const getCivicAlerts = async (req, res, next) => {
  try {
    const alerts = await Notification.list({ recipient: req.user._id, type: 'civic_alert', skip: 0, limit: 50 });
    await Notification.populateReport(alerts, ['title', 'category', 'location']);

    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  broadcastAlert,
  getCivicAlerts,
};
