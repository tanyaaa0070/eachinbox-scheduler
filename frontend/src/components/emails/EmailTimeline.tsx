import React from 'react';
import { EmailStatus } from '../../types';
import { cn } from '../../utils/cn';
import { Clock, Layers, Hourglass, Play, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface EmailTimelineProps {
  status: EmailStatus;
  scheduledAt?: string;
  sentAt?: string | null;
  className?: string;
}

export const EmailTimeline: React.FC<EmailTimelineProps> = ({
  status,
  scheduledAt,
  sentAt,
  className,
}) => {
  const steps = [
    { key: 'SCHEDULED', label: 'Scheduled', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'QUEUED', label: 'Queued (Redis)', icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'PROCESSING', label: 'Processing', icon: <Play className="w-3.5 h-3.5" /> },
    { key: 'SENT', label: 'Sent (SMTP)', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  ];

  // Determine stage index
  let activeIndex = 0;
  if (status === 'SCHEDULED') activeIndex = 1;
  else if (status === 'RATE_LIMITED') activeIndex = 1;
  else if (status === 'PROCESSING') activeIndex = 2;
  else if (status === 'SENT') activeIndex = 3;
  else if (status === 'FAILED' || status === 'CANCELLED') activeIndex = -1;

  if (status === 'FAILED') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-red-600 font-medium', className)}>
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span>Failed Delivery</span>
      </div>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-slate-400 font-medium', className)}>
        <XCircle className="w-4 h-4 text-slate-400" />
        <span>Cancelled</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      {steps.map((step, idx) => {
        const isCompleted = activeIndex > idx;
        const isCurrent = activeIndex === idx;

        return (
          <React.Fragment key={step.key}>
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition',
                isCompleted && 'bg-emerald-50 text-emerald-700 font-semibold',
                isCurrent && 'bg-emerald-600 text-white font-bold shadow-2xs animate-pulse',
                !isCompleted && !isCurrent && 'bg-slate-100 text-slate-400'
              )}
            >
              {step.icon}
              <span className="text-[11px]">{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <span className={cn('text-slate-300 text-xs', activeIndex > idx && 'text-emerald-500 font-bold')}>
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
