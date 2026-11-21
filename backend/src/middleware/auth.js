const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided. Authorization denied.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findAuthById(decoded._id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
    }

    req.user = { _id: user._id, role: user.role, language: user.language };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const { authorize } = require('./rbac');

auth.protect = auth;
auth.auth = auth;
auth.authorize = authorize;

module.exports = auth;
module.exports.protect = auth;
module.exports.auth = auth;
module.exports.authorize = authorize;
