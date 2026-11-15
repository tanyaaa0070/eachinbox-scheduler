import { EmailStatus, CampaignStatus } from '@prisma/client';

export { EmailStatus, CampaignStatus };

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface DashboardStats {
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  rateLimited: number;
}

export interface QueueHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface RateLimitInfo {
  senderId: string;
  senderEmail: string;
  hourlyLimit: number;
  sentThisHour: number;
  remaining: number;
}

export interface SchedulePreview {
  totalRecipients: number;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  estimatedCompletionMinutes: number;
  estimatedCompletionTime: string;
}

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  idempotencyKey: string;
}

// Augment Express types
declare global {
  namespace Express {
    interface User {
      id: string;
      googleId: string;
      name: string;
      email: string;
      avatarUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}
