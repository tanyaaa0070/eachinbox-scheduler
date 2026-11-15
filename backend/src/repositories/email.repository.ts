import { prisma } from '../lib/prisma';
import { EmailStatus, Prisma } from '@prisma/client';

export const emailRepository = {
  async findById(id: string) {
    return prisma.scheduledEmail.findUnique({
      where: { id },
      include: { campaign: true, sender: true },
    });
  },

  async findByIdempotencyKey(key: string) {
    return prisma.scheduledEmail.findUnique({
      where: { idempotencyKey: key },
    });
  },

  async findByBullJobId(jobId: string) {
    return prisma.scheduledEmail.findFirst({
      where: { bullJobId: jobId },
    });
  },

  async findMany(params: {
    userId: string;
    status?: EmailStatus;
    campaignId?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { userId, status, campaignId, search, page, limit } = params;

    const where: Prisma.ScheduledEmailWhereInput = {
      campaign: { userId },
      ...(status && { status }),
      ...(campaignId && { campaignId }),
      ...(search && {
        OR: [
          { recipient: { contains: search, mode: 'insensitive' as const } },
          { subject: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.scheduledEmail.findMany({
        where,
        include: { sender: { select: { email: true, displayName: true } }, campaign: { select: { name: true } } },
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.scheduledEmail.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findScheduled(userId: string, page: number, limit: number, search?: string) {
    return this.findMany({
      userId,
      status: EmailStatus.SCHEDULED,
      page,
      limit,
      search,
    });
  },

  async findSent(userId: string, page: number, limit: number, search?: string) {
    return this.findMany({
      userId,
      status: EmailStatus.SENT,
      page,
      limit,
      search,
    });
  },

  async updateStatus(id: string, status: EmailStatus, extra?: Partial<{
    sentAt: Date;
    messageId: string;
    previewUrl: string;
    errorMessage: string;
    attempts: number;
  }>) {
    return prisma.scheduledEmail.update({
      where: { id },
      data: { status, ...extra, updatedAt: new Date() },
    });
  },

  async markProcessing(id: string) {
    // Optimistic lock: only update if still SCHEDULED or RATE_LIMITED
    const result = await prisma.scheduledEmail.updateMany({
      where: {
        id,
        status: { in: [EmailStatus.SCHEDULED, EmailStatus.RATE_LIMITED] },
      },
      data: {
        status: EmailStatus.PROCESSING,
        updatedAt: new Date(),
      },
    });
    return result.count > 0;
  },

  async markSent(id: string, messageId: string, previewUrl: string | null) {
    return prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        messageId,
        previewUrl,
        updatedAt: new Date(),
      },
    });
  },

  async markFailed(id: string, errorMessage: string, attempts: number) {
    return prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: EmailStatus.FAILED,
        errorMessage,
        attempts,
        updatedAt: new Date(),
      },
    });
  },

  async markRateLimited(id: string) {
    return prisma.scheduledEmail.update({
      where: { id },
      data: {
        status: EmailStatus.RATE_LIMITED,
        updatedAt: new Date(),
      },
    });
  },

  async cancelEmail(id: string, userId: string) {
    return prisma.scheduledEmail.updateMany({
      where: {
        id,
        campaign: { userId },
        status: { in: [EmailStatus.SCHEDULED, EmailStatus.RATE_LIMITED] },
      },
      data: { status: EmailStatus.CANCELLED, updatedAt: new Date() },
    });
  },

  async getStatusCounts(userId: string) {
    const counts = await prisma.scheduledEmail.groupBy({
      by: ['status'],
      where: { campaign: { userId } },
      _count: true,
    });

    const result: Record<string, number> = {
      SCHEDULED: 0,
      PROCESSING: 0,
      SENT: 0,
      FAILED: 0,
      CANCELLED: 0,
      RATE_LIMITED: 0,
    };

    for (const c of counts) {
      result[c.status] = c._count;
    }

    return result;
  },

  async countSentThisHour(senderId: string) {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

    return prisma.scheduledEmail.count({
      where: {
        senderId,
        status: EmailStatus.SENT,
        sentAt: { gte: hourStart },
      },
    });
  },

  async markOpened(id: string) {
    try {
      return await prisma.scheduledEmail.update({
        where: { id },
        data: { openedAt: new Date() },
      });
    } catch {
      return null;
    }
  },

  async markClicked(id: string) {
    try {
      return await prisma.scheduledEmail.update({
        where: { id },
        data: { clickedAt: new Date() },
      });
    } catch {
      return null;
    }
  },

  async findFailed(userId: string) {
    return prisma.scheduledEmail.findMany({
      where: {
        campaign: { userId },
        status: EmailStatus.FAILED,
      },
      include: { campaign: true, sender: true },
    });
  },
};
