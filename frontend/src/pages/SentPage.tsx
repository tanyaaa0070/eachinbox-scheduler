import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { formatDate } from '../utils/date';
import { Send, ExternalLink, RefreshCw, Plus, CheckCircle2 } from 'lucide-react';

interface SentContext {
  onToggleDevTools: () => void;
  onOpenShortcuts: () => void;
}

export const SentPage: React.FC = () => {
  const navigate = useNavigate();
  const { onToggleDevTools, onOpenShortcuts } = useOutletContext<SentContext>();
  const [search, setSearch] = useState('');

  // Fetch sent emails with live polling
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['sent-emails', search],
    queryFn: () => api.getSentEmails(1, 50, search),
    refetchInterval: 3000,
  });

  const emails = data?.items || [];

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Sent Emails"
        description="Completed email deliveries dispatched via Ethereal SMTP."
        searchValue={search}
        onSearchChange={setSearch}
        onOpenShortcuts={onOpenShortcuts}
        onToggleDevTools={onToggleDevTools}
      />

      <div className="p-8 max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {data?.total ?? 0} Successfully Sent
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
              <LoadingState message="Loading sent history from database..." />
            ) : emails.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Sender Account</TableHead>
                    <TableHead>Delivered At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ethereal Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium text-slate-900">
                        {email.recipient}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-600">
                        {email.subject}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {email.sender?.email || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(email.sentAt)}
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
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition shadow-2xs"
                          >
                            <span>Open Mail</span>
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
            ) : (
              <div className="p-8">
                <EmptyState
                  icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                  title="No sent emails yet"
                  description="When workers process scheduled jobs, delivered emails will appear here with live preview links."
                  actionText="Compose Email"
                  onAction={() => navigate('/compose')}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
