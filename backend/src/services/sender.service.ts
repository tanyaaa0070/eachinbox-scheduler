import { senderRepository } from '../repositories/sender.repository';
import { CreateSenderInput } from '../schemas/sender.schema';

export const senderService = {
  async createSender(userId: string, input: CreateSenderInput) {
    return senderRepository.create({ userId, ...input });
  },

  async getSenders(userId: string) {
    return senderRepository.findByUserId(userId);
  },

  async getSender(senderId: string, userId: string) {
    const sender = await senderRepository.findById(senderId);
    if (!sender || sender.userId !== userId) {
      throw Object.assign(new Error('Sender not found'), { statusCode: 404 });
    }
    return sender;
  },
};
