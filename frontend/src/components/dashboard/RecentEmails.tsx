import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { ScheduledEmail } from '../../types';
import { formatDate, formatRelativeTime } from '../../utils/date';
import { useNavigate } from 'react-router-dom';
import { Clock, Send, ExternalLink, ArrowRight } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

interface RecentEmailsProps {
  scheduledEmails?: ScheduledEmail[];
  sentEmails?: ScheduledEmail[];
  isLoading?: boolean;
}

export const RecentEmails: React.FC<RecentEmailsProps> = ({
  scheduledEmails = [],
  sentEmails = [],
  isLoading,
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Scheduled */}
      <Card>
        <CardHeader className="py-3.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Scheduled</h3>
          </div>
          <button
            onClick={() => navigate('/scheduled')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {scheduledEmails.length > 0 ? (
            <Table className="border-0 shadow-none">
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledEmails.slice(0, 5).map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium text-slate-900 max-w-[140px] truncate">
                      {email.recipient}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-slate-600">
                      {email.subject}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatRelativeTime(email.scheduledAt)}
                    </TableCell>
                    <TableCell>
                      <Badge status={email.status} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No scheduled emails"
                description="Compose an email campaign to queue your first batch."
                actionText="Compose Email"
                onAction={() => navigate('/compose')}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sent */}
      <Card>
        <CardHeader className="py-3.5">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Sent Emails</h3>
          </div>
          <button
            onClick={() => navigate('/sent')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {sentEmails.length > 0 ? (
            <Table className="border-0 shadow-none">
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentEmails.slice(0, 5).map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium text-slate-900 max-w-[140px] truncate">
                      {email.recipient}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-slate-600">
                      {email.subject}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(email.sentAt)}
                    </TableCell>
                    <TableCell>
                      {email.previewUrl ? (
                        <a
                          href={email.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
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
          ) : (
            <div className="p-6">
              <EmptyState
                title="No sent emails yet"
                description="Emails will appear here once processed by the worker."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
