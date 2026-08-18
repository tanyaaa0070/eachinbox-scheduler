import { Router } from 'express';
import { emailController } from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { scheduleEmailsSchema } from '../schemas/email.schema';

const router = Router();

// ── Public Tracking Endpoints (No auth needed: called by email clients / recipients) ──
router.get('/track/open/:id', emailController.trackOpen);
router.get('/track/click/:id', emailController.trackClick);

// ── Protected Routes ──
router.use(requireAuth);

// Schedule emails
router.post('/schedule', validate(scheduleEmailsSchema), emailController.schedule);

// Schedule preview (estimated completion)
router.post('/preview', emailController.preview);

// Dead-Letter Queue (DLQ) Retries
router.post('/retry-all-failed', emailController.retryAllFailed);
router.post('/:id/retry', emailController.retry);

// Get all emails
router.get('/', emailController.getAll);

// Get scheduled emails
router.get('/scheduled', emailController.getScheduled);

// Get sent emails
router.get('/sent', emailController.getSent);

// Get single email
router.get('/:id', emailController.getById);

// Cancel email
router.post('/:id/cancel', emailController.cancel);

export default router;
