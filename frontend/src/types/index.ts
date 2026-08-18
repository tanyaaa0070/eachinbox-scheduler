export type EmailStatus = 
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED'
  | 'RATE_LIMITED';

export type CampaignStatus = 
  | 'DRAFT'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Sender {
  id: string;
  email: string;
  displayName: string;
  hourlyLimit: number;
  isActive: boolean;
  smtpHost: string;
  smtpPort: number;
  createdAt: string;
}

export interface ScheduledEmail {
  id: string;
  campaignId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  attempts: number;
  errorMessage: string | null;
  messageId: string | null;
  previewUrl: string | null;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
  sender?: {
    email: string;
    displayName: string;
  };
  campaign?: {
    name: string;
  };
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  startTime: string;
  timezone: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  totalRecipients: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  _count?: {
    emails: number;
  };
  emails?: ScheduledEmail[];
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

export interface SchedulePreviewResponse {
  totalRecipients: number;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  estimatedCompletionMinutes: number;
  estimatedCompletionTime: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
