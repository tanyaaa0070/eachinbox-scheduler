import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';
import { sendSuccess, sendCreated } from '../utils/response';
import { EmailQuery } from '../schemas/email.schema';

export const emailController = {
  /**
   * Schedule a batch of emails.
   * POST /api/emails/schedule
   */
  async schedule(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await emailService.scheduleEmails(req.user!.id, req.body);
      sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get scheduled emails for the current user.
   * GET /api/emails/scheduled
   */
  async getScheduled(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search } = req.query as Partial<EmailQuery>;
      const result = await emailService.getScheduledEmails(req.user!.id, Number(page), Number(limit), search as string);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get sent emails for the current user.
   * GET /api/emails/sent
   */
  async getSent(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search } = req.query as Partial<EmailQuery>;
      const result = await emailService.getSentEmails(req.user!.id, Number(page), Number(limit), search as string);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all emails with optional filters.
   * GET /api/emails
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search, status } = req.query as Partial<EmailQuery>;
      const result = await emailService.getAllEmails(
        req.user!.id,
        Number(page),
        Number(limit),
        search as string,
        status as any
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a single email by ID.
   * GET /api/emails/:id
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const email = await emailService.getEmailById(id, req.user!.id);
      sendSuccess(res, email);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Cancel a scheduled email.
   * POST /api/emails/:id/cancel
   */
  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const result = await emailService.cancelEmail(id, req.user!.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Calculate schedule preview.
   * POST /api/emails/preview
   */
  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const { totalRecipients, startTime, delayBetweenEmails, hourlyLimit } = req.body;
      const preview = emailService.calculateSchedulePreview({
        totalRecipients,
        startTime,
        delayBetweenEmails,
        hourlyLimit,
      });
      sendSuccess(res, preview);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retry single failed email.
   * POST /api/emails/:id/retry
   */
  async retry(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const result = await emailService.retryEmail(id, req.user!.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Retry all failed emails.
   * POST /api/emails/retry-all-failed
   */
  async retryAllFailed(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await emailService.retryAllFailed(req.user!.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Public tracking pixel endpoint.
   * GET /api/emails/track/open/:id
   */
  async trackOpen(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      await emailService.trackOpen(id);

      // Return 1x1 transparent GIF
      const transparentPixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      );
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': transparentPixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
      res.end(transparentPixel);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Public link click tracking redirect.
   * GET /api/emails/track/click/:id
   */
  async trackClick(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const targetUrl = (req.query['url'] as string) || 'https://reachinbox.ai';
      await emailService.trackClick(id, targetUrl);
      res.redirect(targetUrl);
    } catch (error) {
      next(error);
    }
  },
};
