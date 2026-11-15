import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmailTimeline } from '../components/emails/EmailTimeline';
import { formatDate, formatRelativeTime } from '../utils/date';
import { toast } from 'sonner';
import { Clock, Ban, Plus, RefreshCw, Send } from 'lucide-react';

interface ScheduledContext {
  onToggleDevTools: () => void;
  onOpenShortcuts: () => void;
}

export const ScheduledPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { onToggleDevTools, onOpenShortcuts } = useOutletContext<ScheduledContext>();
  const [search, setSearch] = useState('');
  const [emailToCancel, setEmailToCancel] = useState<string | null>(null);

  // Fetch scheduled emails with live polling
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['scheduled-emails', search],
    queryFn: () => api.getScheduledEmails(1, 50, search),
    refetchInterval: 3000,
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: api.cancelEmail,
    onSuccess: () => {
      toast.success('Email cancelled successfully');
      setEmailToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['scheduled-emails'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error('Failed to cancel email', {
        description: err.message || 'Please try again.',
      });
    },
  });

  const emails = data?.items || [];

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Scheduled Emails"
        description="Pending and delayed emails currently held in BullMQ queue."
        searchValue={search}
        onSearchChange={setSearch}
        onOpenShortcuts={onOpenShortcuts}
        onToggleDevTools={onToggleDevTools}
      />

      <div className="p-8 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {data?.total ?? 0} Total Queued
            </span>
            <button
              onClick={() => refetch()}
              className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/compose')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Compose Email
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingState message="Loading scheduled queue from database..." />
            ) : emails.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Pipeline Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium text-slate-900">
                        {email.recipient}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-slate-600">
                        {email.subject}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-800">
                          {formatRelativeTime(email.scheduledAt)}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {formatDate(email.scheduledAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {email.sender?.email || '-'}
                      </TableCell>
                      <TableCell>
                        <EmailTimeline status={email.status} />
                      </TableCell>
                      <TableCell>
                        <Badge status={email.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        {email.status === 'SCHEDULED' || email.status === 'RATE_LIMITED' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEmailToCancel(email.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                            leftIcon={<Ban className="w-3 h-3" />}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8">
                <EmptyState
                  icon={<Clock className="w-6 h-6" />}
                  title="No scheduled emails yet"
                  description="Create your first campaign to schedule and automate email delivery."
                  actionText="Compose Email"
                  onAction={() => navigate('/compose')}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!emailToCancel}
        onClose={() => setEmailToCancel(null)}
        onConfirm={() => emailToCancel && cancelMutation.mutate(emailToCancel)}
        title="Cancel Scheduled Email"
        description="Are you sure you want to cancel this scheduled email? It will be removed from the BullMQ delayed queue."
        confirmText="Yes, Cancel Email"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
};
