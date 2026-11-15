import { prisma } from '../lib/prisma';

export const userRepository = {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({ where: { googleId } });
  },

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
};
