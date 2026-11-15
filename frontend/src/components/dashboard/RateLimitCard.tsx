import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { RateLimitInfo } from '../../types';
import { Gauge, Mail } from 'lucide-react';

interface RateLimitCardProps {
  rateLimits?: RateLimitInfo[];
  isLoading?: boolean;
}

export const RateLimitCard: React.FC<RateLimitCardProps> = ({
  rateLimits,
  isLoading,
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3.5">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Rate Limit Utilization</h3>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Current 1h Window</span>
      </CardHeader>
      <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {rateLimits && rateLimits.length > 0 ? (
          <div className="space-y-4">
            {rateLimits.map((rl) => {
              const percentage = (rl.sentThisHour / rl.hourlyLimit) * 100;
              const variant = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'brand';

              return (
                <div key={rl.senderId} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate max-w-[200px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {rl.senderEmail}
                    </span>
                    <span className="font-medium text-slate-600 font-mono text-[11px]">
                      {rl.sentThisHour} / {rl.hourlyLimit} sent
                    </span>
                  </div>

                  <ProgressBar
                    value={rl.sentThisHour}
                    max={rl.hourlyLimit}
                    variant={variant}
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Hourly Limit: {rl.hourlyLimit}</span>
                    <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {rl.remaining} remaining
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No active senders configured to monitor.
          </div>
        )}

        <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          Redis atomic sliding window rate limiting prevents provider throttling.
        </p>
      </CardContent>
    </Card>
  );
};
