import { Router } from 'express';
import {
  logParcel,
  searchStudentParcels,
  getActiveInventory,
  markPickedUp,
} from '../controllers/parcelController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken, authorizeRoles(['GUARD', 'ADMIN']));

router.post('/', logParcel);
router.get('/search', searchStudentParcels);
router.get('/inventory', getActiveInventory);
router.patch('/:id/pickup', markPickedUp);

export default router;
