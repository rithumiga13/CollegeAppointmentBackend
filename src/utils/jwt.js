const jwt = require('jsonwebtoken');

/**
 * Signs a JWT containing the user's id and role.
 * @param {Object} payload - { id, role }
 * @returns {string} Signed JWT token
 */
const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { signToken, verifyToken };
