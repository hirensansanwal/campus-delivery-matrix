// Uniform JSON envelope for every successful response.
export const sendSuccess = (res, data = null, { status = 200, message } = {}) => {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  return res.status(status).json(body);
};
