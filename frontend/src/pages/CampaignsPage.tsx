import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../utils/date';
import { Layers, Plus, ArrowRight, Clock, Users } from 'lucide-react';

interface CampaignsContext {
  onToggleDevTools: () => void;
  onOpenShortcuts: () => void;
}

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const { onToggleDevTools, onOpenShortcuts } = useOutletContext<CampaignsContext>();

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.getCampaigns(1, 50),
    refetchInterval: 5000,
  });

  const campaigns = data?.items || [];

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Email Campaigns"
        description="Batches, delivery progress, and campaign throughput."
        onOpenShortcuts={onOpenShortcuts}
        onToggleDevTools={onToggleDevTools}
      />

      <div className="p-8 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {data?.total ?? 0} Total Campaigns
          </span>
          <Button
            size="sm"
            onClick={() => navigate('/compose')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Campaign
          </Button>
        </div>

        {isLoading ? (
          <LoadingState message="Loading campaigns from database..." />
        ) : campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((camp) => (
              <Card
                key={camp.id}
                hoverable
                onClick={() => navigate(`/campaigns/${camp.id}`)}
                className="cursor-pointer flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{camp.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{camp.subject}</p>
                    </div>
                    <Badge status={camp.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <p className="text-[10px] text-slate-400">Total Leads</p>
                        <p className="font-bold text-slate-800">{camp.totalRecipients}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <div>
                        <p className="text-[10px] text-slate-400">Delay / Limit</p>
                        <p className="font-bold text-slate-800">{camp.delayBetweenEmails}s / {camp.hourlyLimit}h</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Created {formatDate(camp.createdAt)}</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12">
              <EmptyState
                icon={<Layers className="w-6 h-6" />}
                title="No campaigns created yet"
                description="Compose your first scheduled email campaign to monitor batch progress."
                actionText="Create Campaign"
                onAction={() => navigate('/compose')}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
