import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { EmailJobData } from '../types';

export const EMAIL_QUEUE_NAME = 'email-sending';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export async function getQueueHealth() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  const total = waiting + active + delayed;
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (failed > total * 0.1 && failed > 5) {
    status = 'degraded';
  }
  if (failed > total * 0.5 && failed > 10) {
    status = 'unhealthy';
  }

  return { status, waiting, active, completed, failed, delayed };
}
