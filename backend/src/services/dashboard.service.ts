import { emailRepository } from '../repositories/email.repository';
import { senderRepository } from '../repositories/sender.repository';
import { getQueueHealth } from '../queues/email.queue';
import { rateLimitService } from './rate-limit.service';
import { DashboardStats, QueueHealth, RateLimitInfo } from '../types';

export const dashboardService = {
  async getStats(userId: string): Promise<DashboardStats> {
    const counts = await emailRepository.getStatusCounts(userId);

    return {
      scheduled: counts['SCHEDULED'] ?? 0,
      processing: counts['PROCESSING'] ?? 0,
      sent: counts['SENT'] ?? 0,
      failed: counts['FAILED'] ?? 0,
      cancelled: counts['CANCELLED'] ?? 0,
      rateLimited: counts['RATE_LIMITED'] ?? 0,
    };
  },

  async getQueueHealth(): Promise<QueueHealth> {
    return getQueueHealth();
  },

  async getRateLimits(userId: string): Promise<RateLimitInfo[]> {
    const senders = await senderRepository.findByUserId(userId);
    return rateLimitService.getSenderRateLimits(
      senders.map((s) => ({ id: s.id, email: s.email, hourlyLimit: s.hourlyLimit }))
    );
  },
};
