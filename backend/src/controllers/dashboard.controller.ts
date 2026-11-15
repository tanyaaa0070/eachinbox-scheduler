import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';
import { appEvents, EmailDispatchEvent } from '../lib/events';

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

  /**
   * Real-time Server-Sent Events (SSE) stream for queue telemetry and live dispatch events.
   * GET /api/dashboard/live-stream
   */
  async getLiveStream(req: Request, res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connected handshake
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

    // Listener for live email dispatch events
    const onEmailEvent = (event: EmailDispatchEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    appEvents.on('email:event', onEmailEvent);

    // Heartbeat & Queue health broadcast every 4 seconds
    const interval = setInterval(async () => {
      try {
        const queueHealth = await dashboardService.getQueueHealth();
        res.write(`data: ${JSON.stringify({ type: 'QUEUE_PULSE', data: queueHealth, timestamp: new Date().toISOString() })}\n\n`);
      } catch {
        // ignore errors if queue connection is busy
      }
    }, 4000);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(interval);
      appEvents.off('email:event', onEmailEvent);
      res.end();
    });
  },
};
