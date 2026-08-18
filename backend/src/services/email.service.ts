import { prisma } from '../lib/prisma';
import { emailQueue } from '../queues/email.queue';
import { campaignRepository } from '../repositories/campaign.repository';
import { senderRepository } from '../repositories/sender.repository';
import { emailRepository } from '../repositories/email.repository';
import { logger } from '../config/logger';
import { ScheduleEmailsInput } from '../schemas/email.schema';
import { EmailJobData } from '../types';
import { EmailStatus } from '@prisma/client';
import { appEvents } from '../lib/events';

export const emailService = {
  /**
   * Schedule a batch of emails as a campaign.
   *
   * Supports:
   * 1. Specific sender mailbox
   * 2. "round-robin" rotation across all active mailboxes of user
   * 3. BullMQ delayed jobs per recipient
   * 4. Crash-resistant Redis AOF + PostgreSQL persistence
   */
  async scheduleEmails(userId: string, input: ScheduleEmailsInput) {
    const userSenders = await senderRepository.findByUserId(userId);
    const activeSenders = userSenders.filter((s) => s.isActive);

    if (activeSenders.length === 0) {
      throw Object.assign(new Error('No active senders available for this user'), { statusCode: 400 });
    }

    let defaultSenderId = input.senderId;
    const isRoundRobin = input.senderId === 'round-robin' || !userSenders.some((s) => s.id === input.senderId);

    if (!isRoundRobin) {
      const found = activeSenders.find((s) => s.id === input.senderId);
      if (!found) {
        throw Object.assign(new Error('Specified sender not found or not active'), { statusCode: 404 });
      }
      defaultSenderId = found.id;
    }

    const startTime = new Date(input.startTime);
    const now = new Date();

    if (startTime.getTime() < now.getTime() - 60000) {
      throw Object.assign(new Error('Start time must be in the future'), { statusCode: 400 });
    }

    // Create campaign + email records in transaction
    const campaign = await prisma.$transaction(async (tx) => {
      const campaign = await tx.emailCampaign.create({
        data: {
          userId,
          name: input.name,
          subject: input.subject,
          body: input.body,
          startTime,
          timezone: input.timezone,
          delayBetweenEmails: input.delayBetweenEmails,
          hourlyLimit: input.hourlyLimit,
          totalRecipients: input.recipients.length,
        },
      });

      // Create ScheduledEmail records with sender rotation if round-robin
      const emailRecords = input.recipients.map((recipient, index) => {
        const assignedSenderId = isRoundRobin
          ? (activeSenders[index % activeSenders.length]?.id ?? defaultSenderId)
          : defaultSenderId;

        return {
          campaignId: campaign.id,
          senderId: assignedSenderId,
          recipient,
          subject: input.subject,
          body: input.body,
          scheduledAt: new Date(startTime.getTime() + index * input.delayBetweenEmails * 1000),
          idempotencyKey: `${campaign.id}:${recipient}:${index}`,
          sequenceNumber: index,
        };
      });

      await tx.scheduledEmail.createMany({ data: emailRecords });

      return campaign;
    });

    // Fetch created records to get their IDs
    const emailRecords = await prisma.scheduledEmail.findMany({
      where: { campaignId: campaign.id },
      orderBy: { sequenceNumber: 'asc' },
    });

    // Create BullMQ delayed jobs
    const bulkJobs = emailRecords.map((email) => {
      const delay = Math.max(0, email.scheduledAt.getTime() - Date.now());
      const jobData: EmailJobData = {
        emailId: email.id,
        campaignId: campaign.id,
        senderId: email.senderId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        idempotencyKey: email.idempotencyKey,
      };

      return {
        name: 'send-email',
        data: jobData,
        opts: {
          delay,
          jobId: email.idempotencyKey, // Use idempotency key as job ID to prevent BullMQ duplicates
          attempts: 3,
          backoff: {
            type: 'exponential' as const,
            delay: 5000,
          },
        },
      };
    });

    // Add jobs in bulk (BullMQ pipeline for efficiency)
    const jobs = await emailQueue.addBulk(bulkJobs);

    // Update records with BullMQ job IDs
    await Promise.all(
      jobs.map((job, index) => {
        const record = emailRecords[index];
        if (record && job.id) {
          return prisma.scheduledEmail.update({
            where: { id: record.id },
            data: { bullJobId: job.id },
          });
        }
        return Promise.resolve();
      })
    );

    logger.info(
      {
        campaignId: campaign.id,
        totalRecipients: input.recipients.length,
        startTime: startTime.toISOString(),
        delayBetweenEmails: input.delayBetweenEmails,
        hourlyLimit: input.hourlyLimit,
      },
      'Campaign scheduled'
    );

    return {
      campaign,
      totalScheduled: emailRecords.length,
    };
  },

  async cancelEmail(emailId: string, userId: string) {
    const result = await emailRepository.cancelEmail(emailId, userId);
    if (result.count === 0) {
      throw Object.assign(new Error('Email not found or cannot be cancelled'), { statusCode: 404 });
    }

    // Try to remove from BullMQ queue
    const email = await emailRepository.findById(emailId);
    if (email?.bullJobId) {
      try {
        const job = await emailQueue.getJob(email.bullJobId);
        if (job) {
          await job.remove();
        }
      } catch (err) {
        logger.warn({ emailId, bullJobId: email.bullJobId, err }, 'Failed to remove BullMQ job on cancel');
      }
    }

    return { cancelled: true };
  },

  async getScheduledEmails(userId: string, page: number, limit: number, search?: string) {
    return emailRepository.findMany({
      userId,
      status: EmailStatus.SCHEDULED,
      page,
      limit,
      search,
    });
  },

  async getSentEmails(userId: string, page: number, limit: number, search?: string) {
    return emailRepository.findMany({
      userId,
      status: EmailStatus.SENT,
      page,
      limit,
      search,
    });
  },

  async getEmailById(emailId: string, userId: string) {
    const email = await emailRepository.findById(emailId);
    if (!email || email.campaign.userId !== userId) {
      throw Object.assign(new Error('Email not found'), { statusCode: 404 });
    }
    return email;
  },

  async getAllEmails(userId: string, page: number, limit: number, search?: string, status?: EmailStatus) {
    return emailRepository.findMany({
      userId,
      status,
      page,
      limit,
      search,
    });
  },

  /**
   * Calculate schedule preview (estimated completion time).
   */
  calculateSchedulePreview(params: {
    totalRecipients: number;
    startTime: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
  }) {
    const { totalRecipients, startTime, delayBetweenEmails, hourlyLimit } = params;

    // Time from delay alone (sequential sending)
    const delayTimeSeconds = totalRecipients * delayBetweenEmails;

    // Number of full hours needed considering rate limit
    const hoursNeeded = Math.ceil(totalRecipients / hourlyLimit);

    // The bottleneck is whichever is longer: delay-based time or rate-limit-based time
    const delayBasedMinutes = delayTimeSeconds / 60;
    const rateLimitBasedMinutes = (hoursNeeded - 1) * 60 + (totalRecipients % hourlyLimit || hourlyLimit) * delayBetweenEmails / 60;

    const estimatedCompletionMinutes = Math.max(delayBasedMinutes, rateLimitBasedMinutes);

    const start = new Date(startTime);
    const estimatedEnd = new Date(start.getTime() + estimatedCompletionMinutes * 60 * 1000);

    return {
      totalRecipients,
      startTime,
      delayBetweenEmails,
      hourlyLimit,
      estimatedCompletionMinutes: Math.round(estimatedCompletionMinutes),
      estimatedCompletionTime: estimatedEnd.toISOString(),
    };
  },

  /**
   * Dead-Letter Queue (DLQ): Retry a single failed email.
   */
  async retryEmail(emailId: string, userId: string) {
    const email = await emailRepository.findById(emailId);
    if (!email || email.campaign.userId !== userId) {
      throw Object.assign(new Error('Email not found or access denied'), { statusCode: 404 });
    }

    if (email.status !== EmailStatus.FAILED) {
      throw Object.assign(new Error('Only FAILED emails can be retried'), { statusCode: 400 });
    }

    // Reset status in PostgreSQL
    await emailRepository.updateStatus(emailId, EmailStatus.SCHEDULED, {
      errorMessage: undefined,
      attempts: 0,
    });

    // Re-enqueue in BullMQ immediately
    const jobData: EmailJobData = {
      emailId: email.id,
      campaignId: email.campaignId,
      senderId: email.senderId,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      idempotencyKey: `${email.idempotencyKey}:retry:${Date.now()}`,
    };

    const job = await emailQueue.add('send-email', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });

    await prisma.scheduledEmail.update({
      where: { id: emailId },
      data: { bullJobId: job.id },
    });

    appEvents.emit('email:event', {
      type: 'RETRY',
      emailId: email.id,
      recipient: email.recipient,
      subject: email.subject,
      timestamp: new Date().toISOString(),
    });

    logger.info({ emailId, newJobId: job.id }, 'Email manually retried from DLQ');
    return { success: true, jobId: job.id };
  },

  /**
   * Dead-Letter Queue (DLQ): Replay all failed emails for a user.
   */
  async retryAllFailed(userId: string) {
    const failedEmails = await emailRepository.findFailed(userId);
    if (failedEmails.length === 0) {
      return { retriedCount: 0, message: 'No failed emails to retry' };
    }

    let retriedCount = 0;
    for (const email of failedEmails) {
      try {
        await this.retryEmail(email.id, userId);
        retriedCount++;
      } catch (err) {
        logger.error({ emailId: email.id, err }, 'Failed to retry email from DLQ');
      }
    }

    return { retriedCount, totalFailed: failedEmails.length };
  },

  /**
   * Track email open via 1x1 invisible pixel.
   */
  async trackOpen(emailId: string) {
    const email = await emailRepository.markOpened(emailId);
    if (email) {
      appEvents.emit('email:event', {
        type: 'OPENED',
        emailId: email.id,
        recipient: email.recipient,
        subject: email.subject,
        timestamp: new Date().toISOString(),
      });
      logger.info({ emailId }, 'Email open tracked');
    }
    return email;
  },

  /**
   * Track link click and return destination URL.
   */
  async trackClick(emailId: string, targetUrl: string) {
    const email = await emailRepository.markClicked(emailId);
    if (email) {
      appEvents.emit('email:event', {
        type: 'CLICKED',
        emailId: email.id,
        recipient: email.recipient,
        subject: email.subject,
        timestamp: new Date().toISOString(),
      });
      logger.info({ emailId, targetUrl }, 'Email link click tracked');
    }
    return targetUrl;
  },
};
