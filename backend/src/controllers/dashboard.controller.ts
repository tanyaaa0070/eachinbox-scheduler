import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export const dashboardController = {
  /**
   * Get dashboard stats (email status counts).
   * GET /api/dashboard/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getStats(req.user!.id);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get queue health metrics.
   * GET /api/dashboard/queue-health
   */
  async getQueueHealth(_req: Request, res: Response, next: NextFunction) {
    try {
      const health = await dashboardService.getQueueHealth();
      sendSuccess(res, health);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get rate limit info for all senders.
   * GET /api/dashboard/rate-limits
   */
  async getRateLimits(req: Request, res: Response, next: NextFunction) {
    try {
      const limits = await dashboardService.getRateLimits(req.user!.id);
      sendSuccess(res, limits);
    } catch (error) {
      next(error);
    }
  },
};
