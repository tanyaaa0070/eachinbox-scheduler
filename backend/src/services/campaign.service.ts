import { campaignRepository } from '../repositories/campaign.repository';

export const campaignService = {
  async getCampaigns(userId: string, page: number, limit: number) {
    return campaignRepository.findByUserId(userId, page, limit);
  },

  async getCampaignById(campaignId: string, userId: string) {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign || campaign.userId !== userId) {
      throw Object.assign(new Error('Campaign not found'), { statusCode: 404 });
    }
    // Refresh campaign status based on email statuses
    await campaignRepository.refreshStatus(campaignId);
    return campaignRepository.findById(campaignId);
  },
};
