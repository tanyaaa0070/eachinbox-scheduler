import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', campaignController.getAll);
router.get('/:id', campaignController.getById);

export default router;
