const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

// POST /api/v1/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, language, phone } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Security: public sign-up can only create citizens. Admin/contractor accounts come from the seed
    // script or an admin; honouring a client-supplied role allowed anyone to self-register as admin.
    const user = await User.create({ name, email, password, role: 'citizen', language, phone });

    const token = generateToken({ _id: user._id, role: user.role, language: user.language });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findByEmail(email, { withPassword: true });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await User.comparePassword(user, password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken({ _id: user._id, role: user.role, language: user.language });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        avatar: user.avatar,
        phone: user.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/logout
const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
};

// GET /api/v1/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, logout, getMe };
