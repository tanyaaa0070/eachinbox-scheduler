import { z } from 'zod';

export const scheduleEmailsSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
  senderId: z.string().uuid('Invalid sender ID'),
  startTime: z.string().datetime({ message: 'Invalid ISO datetime' }),
  timezone: z.string().default('UTC'),
  delayBetweenEmails: z.number().int().min(0).max(3600).default(2),
  hourlyLimit: z.number().int().min(1).max(1000).default(50),
});

export type ScheduleEmailsInput = z.infer<typeof scheduleEmailsSchema>;

export const cancelEmailSchema = z.object({
  id: z.string().uuid(),
});

export const emailIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const emailQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'RATE_LIMITED']).optional(),
  search: z.string().optional(),
  campaignId: z.string().uuid().optional(),
});

export type EmailQuery = z.infer<typeof emailQuerySchema>;
