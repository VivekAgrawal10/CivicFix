/** Shared notification helpers (DB row + live socket event + optional push). Never throws. */
const db = require('../config/mysql');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('../config/socket');
const { sendPushNotification } = require('../utils/fcm');

async function notifyUser(recipientId, type, title, message, relatedReport = null) {
  try {
    const notification = await Notification.create({ recipient: recipientId, type, title, message, relatedReport });
    emitToUser(String(recipientId), 'notification', notification);
    const fcmToken = await User.fcmToken(recipientId);
    if (fcmToken) await sendPushNotification(fcmToken, title, message, { type });
    return notification;
  } catch (err) {
    console.error('notifyUser error:', err.message);
    return null;
  }
}

async function notifyAdmins(title, message, relatedReport = null) {
  try {
    const admins = await db.query("SELECT id FROM users WHERE role = 'admin' AND is_active = 1");
    await Promise.all(admins.map((a) => notifyUser(a.id, 'system', title, message, relatedReport)));
  } catch (err) {
    console.error('notifyAdmins error:', err.message);
  }
}

module.exports = { notifyUser, notifyAdmins };
