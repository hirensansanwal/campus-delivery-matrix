import { Router } from 'express';
import {
  getHubStats,
  createGuard,
  listGuards,
} from '../controllers/adminController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken, authorizeRoles(['ADMIN']));

router.get('/stats', getHubStats);
router.route('/guards').get(listGuards).post(createGuard);

export default router;
