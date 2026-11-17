import { Router } from 'express';
import {
  getHubStats,
  createGuard,
  listGuards,
  simulateWebhook,
  simulateNavigationChat,
  seedDemoParcels,
  getWebhooks,
  getChatLogs,
} from '../controllers/adminController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken, authorizeRoles(['ADMIN']));

router.get('/stats', getHubStats);
router.route('/guards').get(listGuards).post(createGuard);

router.post('/mock/webhook', simulateWebhook);
router.post('/mock/chat', simulateNavigationChat);
router.post('/mock/seed', seedDemoParcels);

router.get('/webhooks', getWebhooks);
router.get('/chat-logs', getChatLogs);

export default router;
