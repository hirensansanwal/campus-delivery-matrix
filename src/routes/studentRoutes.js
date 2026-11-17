import { Router } from 'express';
import { searchStudents } from '../controllers/studentController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken, authorizeRoles(['GUARD', 'ADMIN']));

router.get('/search', searchStudents);

export default router;
