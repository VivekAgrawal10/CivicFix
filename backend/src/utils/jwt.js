const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'civicfix_default_jwt_secret_dev_key';

/**
 * Generate a JWT token.
 * @param {object} payload
 * @returns {string} token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verify a JWT token.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
