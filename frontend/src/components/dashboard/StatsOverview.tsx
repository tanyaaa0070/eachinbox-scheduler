import React from 'react';
import { StatCard } from '../ui/StatCard';
import { DashboardStats } from '../../types';
import { Clock, Send, CheckCircle2, AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StatsOverviewProps {
  stats?: DashboardStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Scheduled"
        value={stats?.scheduled ?? 0}
        subtext="Pending in BullMQ queue"
        icon={<Clock className="w-5 h-5 text-slate-600" />}
        onClick={() => navigate('/scheduled')}
      />

      <StatCard
        title="Sending"
        value={stats?.processing ?? 0}
        subtext="Currently processing"
        icon={<Send className="w-5 h-5 text-emerald-600 animate-pulse" />}
      />

      <StatCard
        title="Sent"
        value={stats?.sent ?? 0}
        subtext="Successfully delivered"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        onClick={() => navigate('/sent')}
      />

      <StatCard
        title="Failed"
        value={stats?.failed ?? 0}
        subtext="Retries exhausted"
        icon={<AlertOctagon className="w-5 h-5 text-red-500" />}
      />
    </div>
  );
};
