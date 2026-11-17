import { Router } from 'express';
import authRoutes from './authRoutes.js';
import parcelRoutes from './parcelRoutes.js';
import studentRoutes from './studentRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/parcels', parcelRoutes);
router.use('/students', studentRoutes);

export default router;
