import { Router } from 'express';
import authRoutes from './authRoutes.js';
import parcelRoutes from './parcelRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/parcels', parcelRoutes);

export default router;
