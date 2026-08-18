import { prisma } from '../lib/prisma';
import { emailQueue } from '../queues/email.queue';
import { campaignRepository } from '../repositories/campaign.repository';
import { senderRepository } from '../repositories/sender.repository';
import { emailRepository } from '../repositories/email.repository';
import { logger } from '../config/logger';
import { ScheduleEmailsInput } from '../schemas/email.schema';
import { EmailJobData } from '../types';
import { EmailStatus } from '@prisma/client';

export const emailService = {
  /**
   * Schedule a batch of emails as a campaign.
   *
   * 1. Validates sender belongs to user
   * 2. Creates campaign record
   * 3. Creates ScheduledEmail records in bulk
   * 4. Creates BullMQ delayed jobs for each email
   * 5. Stores bullJobId back on each record
   *
   * All database operations are wrapped in a transaction.
   */
  async scheduleEmails(userId: string, input: ScheduleEmailsInput) {
    const sender = await senderRepository.findById(input.senderId);
    if (!sender || sender.userId !== userId) {
      throw Object.assign(new Error('Sender not found or not owned by user'), { statusCode: 404 });
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

      // Create ScheduledEmail records
      const emailRecords = input.recipients.map((recipient, index) => ({
        campaignId: campaign.id,
        senderId: input.senderId,
        recipient,
        subject: input.subject,
        body: input.body,
        scheduledAt: new Date(startTime.getTime() + index * input.delayBetweenEmails * 1000),
        idempotencyKey: `${campaign.id}:${recipient}:${index}`,
        sequenceNumber: index,
      }));

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
};
