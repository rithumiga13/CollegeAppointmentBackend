const { validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

/**
 * Collects express-validator errors and returns a 422 if any exist.
 * Place this after your validation chain middlewares.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return sendError(res, 422, 'Validation failed', formatted);
  }
  next();
};

module.exports = validate;
