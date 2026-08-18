import { Router } from 'express';
import { senderController } from '../controllers/sender.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createSenderSchema } from '../schemas/sender.schema';

const router = Router();

router.use(requireAuth);

router.get('/', senderController.getAll);
router.post('/', validate(createSenderSchema), senderController.create);

export default router;
