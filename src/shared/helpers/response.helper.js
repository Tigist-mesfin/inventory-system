const sendSuccess = (res, { data = null, message = 'Success', statusCode = 200, meta } = {}) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
};
module.exports = { sendSuccess };
