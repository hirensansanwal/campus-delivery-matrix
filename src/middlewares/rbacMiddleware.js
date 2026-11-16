import ApiError from '../utils/ApiError.js';

// Usage: router.get('/x', authenticateToken, authorizeRoles(['GUARD', 'ADMIN']), handler)
export const authorizeRoles = (allowedRoles = []) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowedRoles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  return next();
};
