import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';
import { sendSuccess } from '../utils/response';

export const campaignController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query['page'] ?? 1);
      const limit = Number(req.query['limit'] ?? 20);
      const result = await campaignService.getCampaigns(req.user!.id, page, limit);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id'] as string;
      const campaign = await campaignService.getCampaignById(id, req.user!.id);
      sendSuccess(res, campaign);
    } catch (error) {
      next(error);
    }
  },
};
