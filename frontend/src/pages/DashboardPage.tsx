import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/layout/Header';
import { StatsOverview } from '../components/dashboard/StatsOverview';
import { QueueHealthCard } from '../components/dashboard/QueueHealthCard';
import { RateLimitCard } from '../components/dashboard/RateLimitCard';
import { RecentEmails } from '../components/dashboard/RecentEmails';

interface DashboardContext {
  onToggleDevTools: () => void;
  onOpenShortcuts: () => void;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { onToggleDevTools, onOpenShortcuts } = useOutletContext<DashboardContext>();
  const [search, setSearch] = useState('');

  // Live polling for stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 3000,
  });

  const { data: queueHealth } = useQuery({
    queryKey: ['queue-health'],
    queryFn: api.getQueueHealth,
    refetchInterval: 3000,
  });

  const { data: rateLimits } = useQuery({
    queryKey: ['rate-limits'],
    queryFn: api.getRateLimits,
    refetchInterval: 3000,
  });

  const { data: scheduledData } = useQuery({
    queryKey: ['recent-scheduled', search],
    queryFn: () => api.getScheduledEmails(1, 5, search),
    refetchInterval: 4000,
  });

  const { data: sentData } = useQuery({
    queryKey: ['recent-sent', search],
    queryFn: () => api.getSentEmails(1, 5, search),
    refetchInterval: 4000,
  });

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title={`${greeting}, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Your sending activity and BullMQ queue health at a glance."
        searchValue={search}
        onSearchChange={setSearch}
        onOpenShortcuts={onOpenShortcuts}
        onToggleDevTools={onToggleDevTools}
      />

      <div className="p-8 space-y-6 max-w-7xl">
        {/* Metric Cards */}
        <StatsOverview stats={stats} />

        {/* Queue Health & Rate Limits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QueueHealthCard health={queueHealth} />
          <RateLimitCard rateLimits={rateLimits} />
        </div>

        {/* Recent Emails Tables */}
        <RecentEmails
          scheduledEmails={scheduledData?.items}
          sentEmails={sentData?.items}
        />
      </div>
    </div>
  );
};
