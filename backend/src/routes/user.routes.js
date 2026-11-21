const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateLanguage,
  updateFcmToken,
  updateProfile,
  deleteUser,
  getContractors,
  getCivicCredsProfile,
  getLeaderboard,
} = require('../controllers/user.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/civic-creds', auth, getCivicCredsProfile);
router.get('/leaderboard', auth, getLeaderboard);
router.get('/contractors', auth, authorize('admin'), getContractors);
router.get('/', auth, authorize('admin'), getAllUsers);
router.get('/:id', auth, getUserById);
router.patch('/language', auth, updateLanguage);
router.patch('/fcm-token', auth, updateFcmToken);
router.patch('/profile', auth, updateProfile);
router.delete('/:id', auth, authorize('admin'), deleteUser);

module.exports = router;
