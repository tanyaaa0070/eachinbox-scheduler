import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { calculateEstimatedCompletion } from '../../utils/schedule';
import { Clock, Users, Timer, Gauge, Calendar } from 'lucide-react';

interface SchedulePreviewCardProps {
  totalRecipients: number;
  delaySeconds: number;
  hourlyLimit: number;
  startTime: string;
}

export const SchedulePreviewCard: React.FC<SchedulePreviewCardProps> = ({
  totalRecipients,
  delaySeconds,
  hourlyLimit,
  startTime,
}) => {
  const estimation = calculateEstimatedCompletion(
    totalRecipients,
    delaySeconds,
    hourlyLimit,
    startTime || new Date()
  );

  return (
    <Card className="bg-emerald-50/40 border-emerald-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Schedule Preview
            </h4>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
            Dynamic Calculation
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
            <p className="text-slate-500 text-[11px] flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              Recipients
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{totalRecipients}</p>
          </div>

          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
            <p className="text-slate-500 text-[11px] flex items-center gap-1">
              <Timer className="w-3 h-3 text-slate-400" />
              Delay
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{delaySeconds}s</p>
          </div>

          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
            <p className="text-slate-500 text-[11px] flex items-center gap-1">
              <Gauge className="w-3 h-3 text-slate-400" />
              Hourly Limit
            </p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{hourlyLimit}</p>
          </div>

          <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
            <p className="text-slate-500 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Est. Duration
            </p>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">{estimation.durationText}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 text-slate-600">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            Estimated Completion:
          </span>
          <span className="font-semibold text-slate-800">{estimation.completionTimeText}</span>
        </div>
      </CardContent>
    </Card>
  );
};
