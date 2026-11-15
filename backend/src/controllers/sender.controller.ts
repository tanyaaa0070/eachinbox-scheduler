import { Request, Response, NextFunction } from 'express';
import { senderService } from '../services/sender.service';
import { sendSuccess, sendCreated } from '../utils/response';

export const senderController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const sender = await senderService.createSender(req.user!.id, req.body);
      sendCreated(res, {
        id: sender.id,
        email: sender.email,
        displayName: sender.displayName,
        hourlyLimit: sender.hourlyLimit,
        isActive: sender.isActive,
      });
    } catch (error) {
      next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const senders = await senderService.getSenders(req.user!.id);
      sendSuccess(res, senders.map((s) => ({
        id: s.id,
        email: s.email,
        displayName: s.displayName,
        hourlyLimit: s.hourlyLimit,
        isActive: s.isActive,
        smtpHost: s.smtpHost,
        smtpPort: s.smtpPort,
        createdAt: s.createdAt,
      })));
    } catch (error) {
      next(error);
    }
  },
};
