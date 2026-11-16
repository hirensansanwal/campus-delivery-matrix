// Wraps an async controller so rejected promises reach the error middleware
// without a try/catch in every handler.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
