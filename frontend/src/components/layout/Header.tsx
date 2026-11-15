import React from 'react';
import { Search, Command, HelpCircle, Terminal } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface HeaderProps {
  title: string;
  description?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onOpenShortcuts?: () => void;
  onToggleDevTools?: () => void;
  showDevToolsButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  description,
  searchValue,
  onSearchChange,
  onOpenShortcuts,
  onToggleDevTools,
  showDevToolsButton = true,
}) => {
  return (
    <header className="h-16 px-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        {onSearchChange && (
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search emails, recipients..."
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
        )}

        {showDevToolsButton && onToggleDevTools && (
          <Tooltip content="Toggle Developer Queue Inspector">
            <button
              onClick={onToggleDevTools}
              className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {onOpenShortcuts && (
          <Tooltip content="Keyboard Shortcuts (?)">
            <button
              onClick={onOpenShortcuts}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </header>
  );
};
