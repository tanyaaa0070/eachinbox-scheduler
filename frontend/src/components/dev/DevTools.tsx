import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { X, RefreshCw, Cpu, Database, Server } from 'lucide-react';

interface DevToolsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevTools: React.FC<DevToolsProps> = ({ isOpen, onClose }) => {
  const { data: queueHealth, refetch: refetchQueue, isFetching: isFetchingQueue } = useQuery({
    queryKey: ['dev-queue-health'],
    queryFn: api.getQueueHealth,
    refetchInterval: isOpen ? 2000 : false, // Poll every 2s when dev tools open
  });

  const { data: rateLimits, refetch: refetchLimits } = useQuery({
    queryKey: ['dev-rate-limits'],
    queryFn: api.getRateLimits,
    refetchInterval: isOpen ? 2000 : false,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col animate-fade-in font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-tight">Queue & Redis Inspector</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchQueue();
              refetchLimits();
            }}
            title="Refresh"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQueue ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs bg-slate-50/50">
        {/* BullMQ Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              BullMQ Queue Status
            </span>
            <Badge status={queueHealth?.status || 'healthy'} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-slate-400 font-medium">Delayed (Scheduled)</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{queueHealth?.delayed ?? 0}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-slate-400 font-medium">Active (Sending)</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{queueHealth?.active ?? 0}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-slate-400 font-medium">Waiting</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{queueHealth?.waiting ?? 0}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-slate-400 font-medium">Completed</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{queueHealth?.completed ?? 0}</p>
            </div>
            <div className="col-span-2 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex justify-between items-center">
              <div>
                <p className="text-slate-400 font-medium">Failed Jobs</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">{queueHealth?.failed ?? 0}</p>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 font-mono">
                Queue: email-sending
              </span>
            </div>
          </div>
        </div>

        {/* Redis Rate Limits */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Redis Hourly Counters
            </span>
          </div>

          <div className="space-y-2">
            {rateLimits && rateLimits.length > 0 ? (
              rateLimits.map((rl) => (
                <div key={rl.senderId} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800 truncate">{rl.senderEmail}</span>
                    <span className="font-mono text-slate-500">
                      {rl.sentThisHour} / {rl.hourlyLimit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (rl.sentThisHour / rl.hourlyLimit) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Remaining capacity: {rl.remaining} emails this hour
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic">No sender accounts configured.</p>
            )}
          </div>
        </div>

        {/* Distributed Architecture Notes */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-1">
          <p className="font-semibold text-emerald-900">Crash & Restart Persistence</p>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            All delayed jobs reside in Redis memory backed by AOF persistence. Restarting the backend or worker picks up existing queue state with zero job loss.
          </p>
        </div>
      </div>
    </div>
  );
};
