import { Router } from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import submissionRoutes from './submissionRoutes.js';
import clearanceRoutes from './clearanceRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'ClearMate API is running', data: { timestamp: new Date().toISOString() } });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/submissions', submissionRoutes);
router.use('/clearances', clearanceRoutes);
router.use('/notifications', notificationRoutes);

export default router;
