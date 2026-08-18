import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/stats', dashboardController.getStats);
router.get('/queue-health', dashboardController.getQueueHealth);
router.get('/rate-limits', dashboardController.getRateLimits);

export default router;
