import React from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { EmailTimeline } from '../components/emails/EmailTimeline';
import { formatDate } from '../utils/date';
import { ArrowLeft, ExternalLink, Users, Clock, Gauge, Send } from 'lucide-react';

interface CampaignDetailContext {
  onToggleDevTools: () => void;
  onOpenShortcuts: () => void;
}

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { onToggleDevTools, onOpenShortcuts } = useOutletContext<CampaignDetailContext>();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign-detail', id],
    queryFn: () => api.getCampaignById(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  if (isLoading) {
    return <LoadingState message="Loading campaign details..." />;
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 text-sm">Campaign not found.</p>
        <Button size="sm" variant="outline" onClick={() => navigate('/campaigns')} className="mt-4">
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const emails = campaign.emails || [];
  const sentCount = emails.filter((e) => e.status === 'SENT').length;
  const failedCount = emails.filter((e) => e.status === 'FAILED').length;
  const progressPercent = Math.round(((sentCount + failedCount) / (campaign.totalRecipients || 1)) * 100);

  return (
    <div className="flex flex-col min-h-full">
      {/* Top Header */}
      <div className="h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{campaign.name}</h2>
              <Badge status={campaign.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500">Subject: {campaign.subject}</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/compose')}
        >
          New Campaign
        </Button>
      </div>

      <div className="p-8 max-w-7xl space-y-6">
        {/* Campaign Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Leads</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{campaign.totalRecipients}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delivered</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{sentCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Delay / Limit</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{campaign.delayBetweenEmails}s / {campaign.hourlyLimit}h</p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Progress</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{progressPercent}%</p>
          </Card>
        </div>

        {/* Recipients Table */}
        <Card>
          <CardHeader>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recipient Dispatch Records ({emails.length})
            </h3>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seq</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Scheduled Time</TableHead>
                  <TableHead>Delivered At</TableHead>
                  <TableHead>Pipeline Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ethereal Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-mono text-xs text-slate-400">
                      #{email.sequenceNumber + 1}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {email.recipient}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {formatDate(email.scheduledAt)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {email.sentAt ? formatDate(email.sentAt) : '-'}
                    </TableCell>
                    <TableCell>
                      <EmailTimeline status={email.status} />
                    </TableCell>
                    <TableCell>
                      <Badge status={email.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      {email.previewUrl ? (
                        <a
                          href={email.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
