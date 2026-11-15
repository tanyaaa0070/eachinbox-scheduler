import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  ShieldCheck, 
  Server, 
  Database, 
  Cpu, 
  RefreshCw, 
  Terminal, 
  CheckCircle2 
} from 'lucide-react';

interface SettingsContext {
  onToggleDevTools: () => void;
  onOpenShortcuts: () => void;
}

export const SettingsPage: React.FC = () => {
  const { onToggleDevTools, onOpenShortcuts } = useOutletContext<SettingsContext>();

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Settings & System Diagnostics"
        description="Configuration overview and backend architectural details."
        onOpenShortcuts={onOpenShortcuts}
        onToggleDevTools={onToggleDevTools}
      />

      <div className="p-8 max-w-5xl space-y-6">
        {/* System Health Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                System Infrastructure
              </h3>
            </div>
            <Badge status="healthy" size="sm">
              Operational
            </Badge>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PostgreSQL 16</span>
                </div>
                <p className="text-slate-800 font-medium">Authoritative State Storage</p>
                <p className="text-[11px] text-slate-400">Prisma ORM with schema migrations</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                  <span>BullMQ + Redis 7</span>
                </div>
                <p className="text-slate-800 font-medium">Delayed Job Scheduler</p>
                <p className="text-[11px] text-slate-400">AOF-backed Redis memory queue</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Idempotency Engine</span>
                </div>
                <p className="text-slate-800 font-medium">Effectively-Once Delivery</p>
                <p className="text-[11px] text-slate-400">Optimistic locks + unique keys</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server Restart Recovery Document */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Crash & Restart Persistence Architecture
              </h3>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-xs text-slate-700 leading-relaxed">
            <p>
              The ReachInbox Scheduler is designed with strict fault isolation between the API server, the BullMQ worker, and the persistent storage tiers.
            </p>
            <ul className="space-y-2 list-disc pl-4 text-slate-600">
              <li>
                <strong className="text-slate-800">Delayed jobs persist in Redis:</strong> When a user schedules an email for future delivery, BullMQ writes the job to Redis sorted sets. Redis persistence (AOF/RDB) ensures no scheduled jobs are lost across process restarts.
              </li>
              <li>
                <strong className="text-slate-800">Authoritative database records:</strong> PostgreSQL records each email's scheduled time, sender ID, recipient, and idempotency key before jobs enter the queue.
              </li>
              <li>
                <strong className="text-slate-800">Zero duplicate restarts:</strong> Upon worker startup, it connects directly to Redis and resumes processing due jobs. No duplicate jobs are injected into the queue.
              </li>
              <li>
                <strong className="text-slate-800">Sliding Rate Limit Rescheduling:</strong> When a sender reaches their configured hourly threshold, the worker computes the delay until the next window and calls <code>job.moveToDelayed()</code> rather than dropping the email.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
