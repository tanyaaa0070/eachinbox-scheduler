import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-2" />
      <p className="text-xs text-slate-500 font-medium">{message}</p>
    </div>
  );
};
