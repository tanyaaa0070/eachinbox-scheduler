import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Zap,
  Activity
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../utils/cn';

interface SidebarProps {
  scheduledCount?: number;
  sentCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  scheduledCount,
  sentCount,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <Layers className="w-4 h-4" /> },
    { 
      to: '/scheduled', 
      label: 'Scheduled', 
      icon: <Clock className="w-4 h-4" />,
      badge: scheduledCount !== undefined && scheduledCount > 0 ? scheduledCount : undefined,
    },
    { 
      to: '/sent', 
      label: 'Sent', 
      icon: <CheckCircle2 className="w-4 h-4" />,
      badge: sentCount !== undefined && sentCount > 0 ? sentCount : undefined,
    },
    { to: '/campaigns', label: 'Campaigns', icon: <Activity className="w-4 h-4" /> },
    { to: '/senders', label: 'Sender Pool', icon: <Users className="w-4 h-4" /> },
    { to: '/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
          <Zap className="w-4 h-4 fill-white" />
        </div>
        <div className="leading-tight">
          <h1 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-1.5">
            ReachInbox
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Scheduler
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Email Dispatch Engine</p>
        </div>
      </div>

      {/* Primary Compose Action */}
      <div className="p-4">
        <button
          onClick={() => navigate('/compose')}
          className="w-full h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition duration-150 cursor-pointer group"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          <span>Compose Email</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded text-emerald-100 font-mono">
            C
          </kbd>
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Navigation
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition duration-150',
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              )
            }
          >
            <span className="shrink-0 text-slate-500">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100/60 transition">
          <Avatar
            src={user?.avatarUrl}
            name={user?.name || 'User'}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'Loading...'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
