import { Router } from 'express';
import { login, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/rbacMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, authorizeRoles(['GUARD', 'ADMIN']), getMe);

export default router;
