import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { QueueHealth } from '../../types';
import { Activity, Clock, CheckCircle, AlertTriangle, PlayCircle } from 'lucide-react';

interface QueueHealthCardProps {
  health?: QueueHealth;
  isLoading?: boolean;
}

export const QueueHealthCard: React.FC<QueueHealthCardProps> = ({
  health,
  isLoading,
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Queue Health</h3>
        </div>
        <Badge status={health?.status || 'healthy'} size="sm" />
      </CardHeader>
      <CardContent className="p-5 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Scheduled</p>
              <p className="text-base font-bold text-slate-900">{health?.delayed ?? 0}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-center gap-2.5">
            <PlayCircle className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-[11px] text-emerald-800 font-medium">Processing</p>
              <p className="text-base font-bold text-emerald-700">{health?.active ?? 0}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Sent (Done)</p>
              <p className="text-base font-bold text-slate-900">{health?.completed ?? 0}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Failed</p>
              <p className="text-base font-bold text-red-600">{health?.failed ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Engine: BullMQ + Redis</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
