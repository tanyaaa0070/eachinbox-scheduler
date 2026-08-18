/**
 * BullMQ Email Worker — Runs as a SEPARATE process from the API server.
 *
 * Responsibilities:
 * 1. Receive jobs from the email-sending queue
 * 2. Check idempotency (skip if already SENT)
 * 3. Acquire processing lock (optimistic via DB status)
 * 4. Check Redis-backed rate limiting
 * 5. If rate limited → reschedule job (do NOT fail)
 * 6. Send via Ethereal SMTP (Nodemailer)
 * 7. Capture messageId + preview URL
 * 8. Update PostgreSQL status → SENT
 * 9. Refresh campaign status
 *
 * Crash recovery:
 * - BullMQ retains delayed jobs in Redis across restarts
 * - PostgreSQL retains authoritative email state
 * - On restart, the worker picks up where it left off
 * - No jobs are recreated from scratch on startup
 *
 * Idempotency:
 * - idempotencyKey = campaignId:recipient:sequenceNumber
 * - Before sending, we check DB status
 * - If status is SENT → acknowledge job, skip sending
 * - If status is PROCESSING (from a previous crash) → check if enough time passed, then retry
 * - This provides "effectively-once" processing
 *
 * IMPORTANT: Distributed transaction boundary
 * There is an unavoidable window between "SMTP accepted the email" and
 * "PostgreSQL records SENT". If the process crashes in this window, the
 * email was sent but not recorded. On restart, the idempotency check sees
 * PROCESSING (not SENT), and may re-send. This is the fundamental limitation
 * of any system without 2PC or outbox pattern. We document this as
 * "effectively-once with idempotency safeguards."
 */

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { logger } from '../config/logger';
import { prisma } from '../lib/prisma';
import { mailService } from '../services/mail.service';
import { rateLimitService } from '../services/rate-limit.service';
import { emailRepository } from '../repositories/email.repository';
import { campaignRepository } from '../repositories/campaign.repository';
import { EMAIL_QUEUE_NAME, emailQueue } from '../queues/email.queue';
import { EmailJobData } from '../types';
import { EmailStatus } from '@prisma/client';
import { appEvents } from '../lib/events';

// Load env with defaults for worker process
const WORKER_CONCURRENCY = parseInt(process.env['WORKER_CONCURRENCY'] ?? '5', 10);

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailId, idempotencyKey, campaignId } = job.data;

  logger.info(
    { jobId: job.id, emailId, attempt: job.attemptsMade + 1 },
    'Worker processing email job'
  );

  // ── Step 1: Fetch email record ──
  const email = await prisma.scheduledEmail.findUnique({
    where: { id: emailId },
    include: { sender: true },
  });

  if (!email) {
    logger.warn({ emailId, idempotencyKey }, 'Email record not found in database, acknowledging job');
    return; // Acknowledge — record was deleted
  }

  // ── Step 2: Idempotency check ──
  if (email.status === EmailStatus.SENT) {
    logger.info({ emailId, idempotencyKey }, 'Email already SENT, skipping (idempotency)');
    return; // Already sent — do not re-send
  }

  if (email.status === EmailStatus.CANCELLED) {
    logger.info({ emailId }, 'Email is CANCELLED, skipping');
    return;
  }

  // ── Step 3: Acquire processing lock (optimistic) ──
  const acquired = await emailRepository.markProcessing(email.id);
  if (!acquired) {
    logger.info({ emailId }, 'Could not acquire processing lock, another worker may be handling this');
    return;
  }

  appEvents.emit('email:event', {
    type: 'PROCESSING',
    emailId: email.id,
    recipient: email.recipient,
    senderEmail: email.sender.email,
    subject: email.subject,
    timestamp: new Date().toISOString(),
  });

  // ── Step 4: Rate limit check ──
  const rateCheck = await rateLimitService.checkAndIncrement(
    email.senderId,
    email.sender.hourlyLimit
  );

  if (!rateCheck.allowed) {
    // Reschedule instead of failing
    logger.info(
      { emailId, senderId: email.senderId, retryAfterMs: rateCheck.retryAfterMs },
      'Rate limit reached, rescheduling job'
    );

    // Mark as rate limited
    await emailRepository.markRateLimited(email.id);

    appEvents.emit('email:event', {
      type: 'RATE_LIMITED',
      emailId: email.id,
      recipient: email.recipient,
      senderEmail: email.sender.email,
      retryAfterMs: rateCheck.retryAfterMs,
      timestamp: new Date().toISOString(),
    });

    // Move job to delayed state
    await job.moveToDelayed(Date.now() + rateCheck.retryAfterMs, job.token);

    // Throw DelayedError to tell BullMQ this job is not failed, just delayed
    throw new DelayedError();
  }

  // ── Step 5: Send email via SMTP ──
  try {
    const result = await mailService.sendEmail({
      sender: {
        smtpHost: email.sender.smtpHost,
        smtpPort: email.sender.smtpPort,
        smtpUser: email.sender.smtpUser,
        smtpPass: email.sender.smtpPass,
        displayName: email.sender.displayName,
        email: email.sender.email,
      },
      to: email.recipient,
      subject: email.subject,
      body: email.body,
    });

    // ── Step 6: Mark as SENT in PostgreSQL ──
    await emailRepository.markSent(email.id, result.messageId, result.previewUrl);

    appEvents.emit('email:event', {
      type: 'SENT',
      emailId: email.id,
      recipient: email.recipient,
      senderEmail: email.sender.email,
      subject: email.subject,
      previewUrl: result.previewUrl,
      timestamp: new Date().toISOString(),
    });

    logger.info(
      {
        emailId: email.id,
        messageId: result.messageId,
        previewUrl: result.previewUrl,
        recipient: email.recipient,
      },
      'Email sent successfully'
    );

    // ── Step 7: Refresh campaign status ──
    await campaignRepository.refreshStatus(campaignId);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const attempts = (email.attempts ?? 0) + 1;

    appEvents.emit('email:event', {
      type: 'FAILED',
      emailId: email.id,
      recipient: email.recipient,
      errorMessage,
      timestamp: new Date().toISOString(),
    });

    logger.error(
      { emailId: email.id, error: errorMessage, attempts },
      'Failed to send email'
    );

    // Mark as failed in PostgreSQL (BullMQ retry will create a new attempt)
    if (job.attemptsMade + 1 >= (job.opts.attempts ?? 3)) {
      // Final attempt — mark as permanently FAILED
      await emailRepository.markFailed(email.id, errorMessage, attempts);
      await campaignRepository.refreshStatus(campaignId);
    } else {
      // Will be retried — revert to SCHEDULED so idempotency check allows retry
      await emailRepository.updateStatus(email.id, EmailStatus.SCHEDULED, {
        errorMessage: `Attempt ${attempts}: ${errorMessage}`,
        attempts,
      });
    }

    throw error; // Re-throw so BullMQ handles retry
  }
}

/**
 * Custom error to signal BullMQ that the job should be delayed, not failed.
 */
class DelayedError extends Error {
  constructor() {
    super('Job delayed due to rate limiting');
    this.name = 'DelayedError';
  }
}

// ── Create and start worker ──
const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  processEmailJob,
  {
    connection: createRedisConnection(),
    concurrency: WORKER_CONCURRENCY,
    limiter: {
      max: WORKER_CONCURRENCY,
      duration: 1000, // Process at most WORKER_CONCURRENCY jobs per second
    },
  }
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});

worker.on('failed', (job, err) => {
  if (err instanceof DelayedError) {
    // Not a real failure — job was rescheduled
    return;
  }
  logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
});

worker.on('error', (err) => {
  logger.error({ error: err.message }, 'Worker error');
});

// ── Graceful shutdown ──
async function shutdown(signal: string) {
  logger.info({ signal }, 'Worker shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info(
  { concurrency: WORKER_CONCURRENCY, queue: EMAIL_QUEUE_NAME },
  '🔧 Email worker started'
);
