import React from 'react';
import { Card } from './Card';
import { cn } from '../../utils/cn';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  className,
  onClick,
}) => {
  return (
    <Card
      hoverable={!!onClick}
      className={cn('p-5 cursor-default', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
            {trend && (
              <span
                className={cn(
                  'text-xs font-semibold',
                  trend.positive ? 'text-emerald-600' : 'text-slate-500'
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-slate-500 pt-0.5">{subtext}</p>}
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
