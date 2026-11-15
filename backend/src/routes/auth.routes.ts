import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Initiate Google OAuth
router.get('/google', authController.googleLogin);

// Google OAuth callback
router.get('/google/callback', ...authController.googleCallback);

// 1-Click Demo Login
router.post('/demo', authController.demoLogin);

// Get current user
router.get('/me', requireAuth, authController.me);

// Logout
router.post('/logout', requireAuth, authController.logout);

export default router;
