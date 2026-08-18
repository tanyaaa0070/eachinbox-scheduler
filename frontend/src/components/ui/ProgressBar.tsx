import React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressBarProps {
  value: number; // 0 to 100 or current
  max?: number;
  label?: string;
  sublabel?: string;
  showPercentage?: boolean;
  variant?: 'brand' | 'warning' | 'danger';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  sublabel,
  showPercentage = false,
  variant = 'brand',
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const variantStyles = {
    brand: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(label || sublabel || showPercentage) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-slate-700">{label}</span>}
          <div className="flex items-center gap-2 ml-auto text-slate-500">
            {sublabel && <span>{sublabel}</span>}
            {showPercentage && <span className="font-semibold text-slate-700">{Math.round(percentage)}%</span>}
          </div>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
        <div
          className={cn('h-full transition-all duration-300 rounded-full', variantStyles[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
