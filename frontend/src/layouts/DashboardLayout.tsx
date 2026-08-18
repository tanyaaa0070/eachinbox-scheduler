import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Sidebar } from '../components/layout/Sidebar';
import { ShortcutHelp } from '../components/shortcuts/ShortcutHelp';
import { DevTools } from '../components/dev/DevTools';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export const DashboardLayout: React.FC = () => {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  // Fetch stats for sidebar badge counts
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 5000, // Poll every 5 seconds for live stats
  });

  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        scheduledCount={stats?.scheduled}
        sentCount={stats?.sent}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ onToggleDevTools: () => setIsDevToolsOpen(prev => !prev), onOpenShortcuts: () => setShowHelp(true) }} />
        </main>
      </div>

      {/* Dev Tools Drawer */}
      <DevTools
        isOpen={isDevToolsOpen}
        onClose={() => setIsDevToolsOpen(false)}
      />

      {/* Shortcuts Modal */}
      <ShortcutHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
};
