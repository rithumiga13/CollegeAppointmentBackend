const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Formats the user document for API responses (strips sensitive fields).
 */
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 409, 'An account with this email already exists.');
    }

    const user = await User.create({ name, email, password, role, department });
    const token = signToken({ id: user._id, role: user.role });

    return sendSuccess(res, 201, 'Account created successfully.', {
      token,
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password (it is excluded by default via `select: false`)
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    const token = signToken({ id: user._id, role: user.role });

    return sendSuccess(res, 200, 'Logged in successfully.', {
      token,
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me  (protected)
// ---------------------------------------------------------------------------
const getMe = async (req, res) => {
  return sendSuccess(res, 200, 'User profile fetched.', {
    user: formatUser(req.user),
  });
};

module.exports = { register, login, getMe };
