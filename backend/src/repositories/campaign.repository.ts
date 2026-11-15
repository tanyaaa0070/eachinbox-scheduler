import { prisma } from '../lib/prisma';
import { CampaignStatus, EmailStatus } from '@prisma/client';

export const campaignRepository = {
  async create(data: {
    userId: string;
    name: string;
    subject: string;
    body: string;
    startTime: Date;
    timezone: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
    totalRecipients: number;
  }) {
    return prisma.emailCampaign.create({ data });
  },

  async findById(id: string) {
    return prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        emails: {
          include: { sender: { select: { email: true, displayName: true } } },
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    });
  },

  async findByUserId(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { emails: true } },
        },
      }),
      prisma.emailCampaign.count({ where: { userId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async updateStatus(id: string, status: CampaignStatus) {
    return prisma.emailCampaign.update({
      where: { id },
      data: { status },
    });
  },

  async refreshStatus(id: string) {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: { emails: true },
        },
      },
    });

    if (!campaign) return null;

    const sentCount = await prisma.scheduledEmail.count({
      where: { campaignId: id, status: EmailStatus.SENT },
    });

    const failedCount = await prisma.scheduledEmail.count({
      where: { campaignId: id, status: EmailStatus.FAILED },
    });

    const total = campaign._count.emails;

    let newStatus: CampaignStatus;
    if (sentCount + failedCount >= total) {
      newStatus = failedCount > 0 && sentCount === 0 ? CampaignStatus.FAILED : CampaignStatus.COMPLETED;
    } else if (sentCount > 0 || failedCount > 0) {
      newStatus = CampaignStatus.IN_PROGRESS;
    } else {
      newStatus = campaign.status;
    }

    if (newStatus !== campaign.status) {
      return prisma.emailCampaign.update({
        where: { id },
        data: { status: newStatus },
      });
    }

    return campaign;
  },
};
