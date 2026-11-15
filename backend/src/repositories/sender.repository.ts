import { prisma } from '../lib/prisma';

export const senderRepository = {
  async create(data: {
    userId: string;
    email: string;
    displayName: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPass: string;
    hourlyLimit?: number;
  }) {
    return prisma.sender.create({ data });
  },

  async findById(id: string) {
    return prisma.sender.findUnique({ where: { id } });
  },

  async findByUserId(userId: string) {
    return prisma.sender.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findFirstActive(userId: string) {
    return prisma.sender.findFirst({
      where: { userId, isActive: true },
    });
  },

  async update(id: string, data: Partial<{
    displayName: string;
    hourlyLimit: number;
    isActive: boolean;
  }>) {
    return prisma.sender.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.sender.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
