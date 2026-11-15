import React from 'react';
import { cn } from '../../utils/cn';
import { EmailStatus, CampaignStatus } from '../../types';

export interface BadgeProps {
  children?: React.ReactNode;
  status?: EmailStatus | CampaignStatus | 'healthy' | 'degraded' | 'unhealthy';
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  status,
  variant,
  size = 'md',
  className,
}) => {
  let resolvedVariant = variant || 'default';

  if (status) {
    switch (status) {
      case 'SENT':
      case 'COMPLETED':
      case 'healthy':
        resolvedVariant = 'success';
        break;
      case 'PROCESSING':
      case 'IN_PROGRESS':
        resolvedVariant = 'info';
        break;
      case 'SCHEDULED':
      case 'DRAFT':
        resolvedVariant = 'neutral';
        break;
      case 'RATE_LIMITED':
      case 'degraded':
        resolvedVariant = 'warning';
        break;
      case 'FAILED':
      case 'CANCELLED':
      case 'unhealthy':
        resolvedVariant = 'error';
        break;
    }
  }

  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const dotStyles = {
    default: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 font-medium',
  };

  const displayText = children || (status ? status.replace(/_/g, ' ') : '');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border shadow-2xs select-none',
        variantStyles[resolvedVariant],
        sizeStyles[size],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[resolvedVariant])} />
      <span className="capitalize">{displayText}</span>
    </span>
  );
};
