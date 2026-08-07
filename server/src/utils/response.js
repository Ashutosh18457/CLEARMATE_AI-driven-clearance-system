/**
 * Standardized API response envelope.
 * Every response from this API follows the same shape,
 * making frontend parsing predictable and consistent.
 */

const sendSuccess = (res, { data = null, message = 'Success', statusCode = 200 } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

const sendCreated = (res, { data = null, message = 'Created successfully' } = {}) => {
  return sendSuccess(res, { data, message, statusCode: 201 });
};

const sendNoContent = (res) => {
  return res.status(204).end();
};

module.exports = { sendSuccess, sendCreated, sendNoContent };
