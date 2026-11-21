const User = require('../models/User');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const { getCompanyPerformanceFromView } = require('../services/mysqlService');

// GET /api/v1/users — admin only
const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const [users, total] = await Promise.all([
      User.list({ role: filter.role, skip, limit }),
      User.count({ role: filter.role }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/users/:id — admin or self
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/users/language
const updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    if (!['en', 'pa', 'hi'].includes(language)) {
      return res.status(400).json({ success: false, message: 'Invalid language. Must be en, pa, or hi.' });
    }

    const user = await User.update(req.user._id, { language });

    res.json({ success: true, message: 'Language preference updated.', data: user });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/users/fcm-token
const updateFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM token is required.' });
    }

    await User.update(req.user._id, { fcmToken });
    res.json({ success: true, message: 'FCM token updated.' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'avatar'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const user = await User.update(req.user._id, updates);

    res.json({ success: true, message: 'Profile updated.', data: user });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/users/:id — admin only
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.delete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/users/contractors — admin only
const getContractors = async (req, res, next) => {
  try {
    const contractors = await User.contractors();

    const enriched = contractors.map(({ u, activeOrders, completedOrders }) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      createdAt: u.createdAt,
      activeOrders,
      completedOrders,
      performanceScore: completedOrders > 0 ? Math.min(100, Math.round(80 + (completedOrders * 2))) : 80,
    }));

    let mysqlPerformance = null;
    try {
      mysqlPerformance = await getCompanyPerformanceFromView();
    } catch (_) {}

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
      contractorPerformanceMetrics: mysqlPerformance || [],
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/users/civic-creds — Current user's CivicCreds, tier & badges
const getCivicCredsProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const creds = user.civicCreds || 50;
    res.json({
      success: true,
      data: {
        name: user.name,
        civicCreds: creds,
        civicScore: user.civicScore || 100,
        citizenTier: user.citizenTier || 'Bronze Citizen',
        badges: user.badges || ['Welcome Citizen'],
        history: user.credsHistory || [],
        tierProgress: {
          currentTier: user.citizenTier || 'Bronze Citizen',
          nextTier:
            creds >= 750
              ? 'Max Tier Reached'
              : creds >= 300
              ? 'Platinum City Hero'
              : creds >= 100
              ? 'Gold Civic Champion'
              : 'Silver Guardian',
          pointsNeededForNextTier:
            creds >= 750
              ? 0
              : creds >= 300
              ? 750 - creds
              : creds >= 100
              ? 300 - creds
              : 100 - creds,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/users/leaderboard — Top city contributors
const getLeaderboard = async (req, res, next) => {
  try {
    const topUsers = (await User.leaderboard(10)).map((u) => ({
      _id: u._id, name: u.name, avatar: u.avatar, civicCreds: u.civicCreds, civicScore: u.civicScore, citizenTier: u.citizenTier, badges: u.badges,
    }));

    res.json({ success: true, count: topUsers.length, data: topUsers });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateLanguage,
  updateFcmToken,
  updateProfile,
  deleteUser,
  getContractors,
  getCivicCredsProfile,
  getLeaderboard,
};
