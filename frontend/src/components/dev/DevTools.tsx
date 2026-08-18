import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  X, 
  RefreshCw, 
  Cpu, 
  Database, 
  Server, 
  Activity, 
  RotateCcw, 
  ExternalLink,
  Radio
} from 'lucide-react';
import { toast } from 'sonner';

interface DevToolsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LiveEvent {
  id: string;
  type: string;
  recipient?: string;
  previewUrl?: string;
  errorMessage?: string;
  timestamp: string;
}

export const DevTools: React.FC<DevToolsProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const { data: queueHealth, refetch: refetchQueue, isFetching: isFetchingQueue } = useQuery({
    queryKey: ['dev-queue-health'],
    queryFn: api.getQueueHealth,
    refetchInterval: isOpen ? 2500 : false,
  });

  const { data: rateLimits, refetch: refetchLimits } = useQuery({
    queryKey: ['dev-rate-limits'],
    queryFn: api.getRateLimits,
    refetchInterval: isOpen ? 2500 : false,
  });

  // Replay failed mutation
  const retryAllMutation = useMutation({
    mutationFn: api.retryAllFailed,
    onSuccess: (data) => {
      toast.success(`Re-enqueued ${data.retriedCount} failed jobs into BullMQ!`);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['queue-health'] });
      queryClient.invalidateQueries({ queryKey: ['recent-scheduled'] });
      refetchQueue();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to retry jobs');
    },
  });

  // Connect to SSE Live Stream
  useEffect(() => {
    if (!isOpen) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/dashboard/live-stream', { withCredentials: true });

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type === 'CONNECTED') {
            setIsConnected(true);
          } else if (parsed.type === 'QUEUE_PULSE') {
            // Heartbeat
          } else {
            // Email event
            setLiveEvents((prev) => [
              {
                id: Math.random().toString(),
                type: parsed.type,
                recipient: parsed.recipient,
                previewUrl: parsed.previewUrl,
                errorMessage: parsed.errorMessage,
                timestamp: parsed.timestamp || new Date().toISOString(),
              },
              ...prev.slice(0, 19), // Keep last 20 events
            ]);
            
            // Invalidate queries to keep UI sync
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            queryClient.invalidateQueries({ queryKey: ['recent-scheduled'] });
            queryClient.invalidateQueries({ queryKey: ['recent-sent'] });
          }
        } catch {
          // ignore parsing error
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch {
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isOpen, queryClient]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col animate-fade-in font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-tight">Queue & Redis Inspector</h3>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
            isConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            <Radio className={`w-2.5 h-2.5 ${isConnected ? 'animate-pulse' : ''}`} />
            {isConnected ? 'LIVE SSE' : 'POLLING'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              refetchQueue();
              refetchLimits();
            }}
            title="Refresh metrics"
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
      <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs bg-slate-50/50">
        {/* BullMQ Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              BullMQ Delayed Queue Status
            </span>
            <Badge status={queueHealth?.status || 'healthy'} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-slate-400 font-medium">Delayed (In ZSET)</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{queueHealth?.delayed ?? 0}</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-slate-400 font-medium">Active (Worker Pool)</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{queueHealth?.active ?? 0}</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-slate-400 font-medium">Waiting</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{queueHealth?.waiting ?? 0}</p>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <p className="text-slate-400 font-medium">Completed</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{queueHealth?.completed ?? 0}</p>
            </div>
            <div className="col-span-2 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex justify-between items-center">
              <div>
                <p className="text-slate-400 font-medium">Dead-Letter Queue (Failed)</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">{queueHealth?.failed ?? 0}</p>
              </div>
              {(queueHealth?.failed ?? 0) > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => retryAllMutation.mutate()}
                  isLoading={retryAllMutation.isPending}
                  className="text-xs h-7 flex items-center gap-1 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <RotateCcw className="w-3 h-3" /> Replay DLQ
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Redis Rate Limits */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-600" />
              Redis Sliding Window Quotas
            </span>
          </div>

          <div className="space-y-2">
            {rateLimits && rateLimits.length > 0 ? (
              rateLimits.map((rl) => (
                <div key={rl.senderId} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
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
                    Remaining capacity: {rl.remaining} emails this hour window
                  </p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic">No sender accounts configured.</p>
            )}
          </div>
        </div>

        {/* Real-time Telemetry Event Stream */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Live Telemetry Stream
            </span>
            <span className="text-[10px] text-slate-400">Auto-updates</span>
          </div>

          <div className="bg-slate-900 text-slate-200 p-3 rounded-lg border border-slate-800 font-mono text-[11px] max-h-48 overflow-y-auto space-y-2 shadow-inner">
            {liveEvents.length > 0 ? (
              liveEvents.map((evt) => (
                <div key={evt.id} className="border-b border-slate-800/80 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${
                      evt.type === 'SENT' ? 'text-emerald-400' :
                      evt.type === 'RATE_LIMITED' ? 'text-amber-400' :
                      evt.type === 'FAILED' ? 'text-red-400' :
                      evt.type === 'OPENED' ? 'text-purple-400' :
                      evt.type === 'CLICKED' ? 'text-blue-400' :
                      'text-indigo-300'
                    }`}>
                      [{evt.type}]
                    </span>
                    <span className="text-[9px] text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300 truncate text-[10px]">{evt.recipient}</p>
                  {evt.previewUrl && (
                    <a
                      href={evt.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 underline mt-0.5"
                    >
                      <span>Ethereal Preview</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic text-center py-4">Waiting for worker events...</p>
            )}
          </div>
        </div>

        {/* Distributed Architecture Notes */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-1">
          <p className="font-semibold text-emerald-900">Zero-Loss Persistence Guarantee</p>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            BullMQ delayed jobs persist in Redis sorted sets across process restarts. PostgreSQL maintains authoritative transactional status.
          </p>
        </div>
      </div>
    </div>
  );
};
