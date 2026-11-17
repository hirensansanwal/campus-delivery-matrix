import { Router } from 'express';
import authRoutes from './authRoutes.js';
import parcelRoutes from './parcelRoutes.js';
import studentRoutes from './studentRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/parcels', parcelRoutes);
router.use('/students', studentRoutes);
router.use('/admin', adminRoutes);

export default router;
