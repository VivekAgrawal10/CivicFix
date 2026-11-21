const { admin } = require('../config/firebase');

/**
 * Send a push notification via Firebase Cloud Messaging.
 * Gracefully handles failures — will log but never crash the server.
 * @param {string} fcmToken
 * @param {string} title
 * @param {string} body
 * @param {object} data - additional key-value pairs (all string values)
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return;

  try {
    if (!admin || !admin.messaging) {
      console.warn('FCM: Firebase Admin not initialized — skipping push notification');
      return;
    }

    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      stringifiedData[key] = String(value);
    }

    const message = {
      token: fcmToken,
      notification: { title, body },
      data: stringifiedData,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };

    const response = await admin.messaging().send(message);
    console.log(`FCM: Notification sent successfully — messageId: ${response}`);
  } catch (error) {
    console.error(`FCM: Failed to send push notification — ${error.message}`);
  }
};

module.exports = { sendPushNotification };
