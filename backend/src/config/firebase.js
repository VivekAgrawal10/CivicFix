const admin = require('firebase-admin');
const path = require('path');

let firebaseApp = null;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountPath) {
      console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_KEY not set — push notifications disabled');
      return null;
    }

    const serviceAccount = require(path.resolve(serviceAccountPath));

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.warn(`⚠️  Firebase initialization failed: ${error.message} — push notifications disabled`);
    return null;
  }
};

module.exports = { initFirebase, admin };
