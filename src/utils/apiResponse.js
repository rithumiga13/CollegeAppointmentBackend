/**
 * Sends a standardised success response.
 * @param {Response} res  - Express response object
 * @param {number}   statusCode
 * @param {string}   message
 * @param {*}        data
 */
const sendSuccess = (res, statusCode, message, data = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Sends a standardised error response.
 * @param {Response} res
 * @param {number}   statusCode
 * @param {string}   message
 * @param {*}        errors - optional field-level validation errors
 */
const sendError = (res, statusCode, message, errors = null) => {
  const response = { success: false, message };
  if (errors !== null) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendError };
