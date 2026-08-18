import { 
  ApiResponse, 
  User, 
  DashboardStats, 
  QueueHealth, 
  RateLimitInfo, 
  PaginatedResponse, 
  ScheduledEmail, 
  EmailCampaign, 
  Sender,
  SchedulePreviewResponse 
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include session cookie
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Failed to parse response' },
  }));

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Request failed with status ${res.status}`);
  }

  return json.data as T;
}

export const api = {
  // ── Auth ──
  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },
  async loginDemo(): Promise<User> {
    return request<User>('/auth/demo', { method: 'POST' });
  },
  async logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },

  // ── Dashboard ──
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/dashboard/stats');
  },
  async getQueueHealth(): Promise<QueueHealth> {
    return request<QueueHealth>('/dashboard/queue-health');
  },
  async getRateLimits(): Promise<RateLimitInfo[]> {
    return request<RateLimitInfo[]>('/dashboard/rate-limits');
  },

  // ── Emails ──
  async getScheduledEmails(page = 1, limit = 20, search = ''): Promise<PaginatedResponse<ScheduledEmail>> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    return request<PaginatedResponse<ScheduledEmail>>(`/emails/scheduled?${params.toString()}`);
  },
  async getSentEmails(page = 1, limit = 20, search = ''): Promise<PaginatedResponse<ScheduledEmail>> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    return request<PaginatedResponse<ScheduledEmail>>(`/emails/sent?${params.toString()}`);
  },
  async getAllEmails(page = 1, limit = 20, search = '', status = ''): Promise<PaginatedResponse<ScheduledEmail>> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    return request<PaginatedResponse<ScheduledEmail>>(`/emails?${params.toString()}`);
  },
  async getEmailById(id: string): Promise<ScheduledEmail> {
    return request<ScheduledEmail>(`/emails/${id}`);
  },
  async cancelEmail(id: string): Promise<{ cancelled: boolean }> {
    return request<{ cancelled: boolean }>(`/emails/${id}/cancel`, { method: 'POST' });
  },
  async scheduleEmails(data: {
    name: string;
    subject: string;
    body: string;
    recipients: string[];
    senderId: string;
    startTime: string;
    timezone: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
  }): Promise<{ campaign: EmailCampaign; totalScheduled: number }> {
    return request<{ campaign: EmailCampaign; totalScheduled: number }>('/emails/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async previewSchedule(data: {
    totalRecipients: number;
    startTime: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
  }): Promise<SchedulePreviewResponse> {
    return request<SchedulePreviewResponse>('/emails/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ── Campaigns ──
  async getCampaigns(page = 1, limit = 20): Promise<PaginatedResponse<EmailCampaign>> {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return request<PaginatedResponse<EmailCampaign>>(`/campaigns?${params.toString()}`);
  },
  async getCampaignById(id: string): Promise<EmailCampaign> {
    return request<EmailCampaign>(`/campaigns/${id}`);
  },

  // ── Senders ──
  async getSenders(): Promise<Sender[]> {
    return request<Sender[]>('/senders');
  },
  async createSender(data: {
    email: string;
    displayName: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    hourlyLimit: number;
  }): Promise<Sender> {
    return request<Sender>('/senders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
