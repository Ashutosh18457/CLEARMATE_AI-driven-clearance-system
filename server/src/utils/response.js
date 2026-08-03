export const success = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const created = (res, message, data = {}) => {
  return success(res, message, data, 201);
};
