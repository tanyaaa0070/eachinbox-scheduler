import React from 'react';
import { Modal } from '../ui/Modal';

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutHelp: React.FC<ShortcutHelpProps> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: 'C', description: 'Compose new email campaign' },
    { key: 'G then S', description: 'Go to Scheduled emails' },
    { key: 'G then T', description: 'Go to Sent emails' },
    { key: 'G then D', description: 'Go to Dashboard' },
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'Esc', description: 'Close modals / dialogs' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" maxWidth="md">
      <div className="space-y-3">
        <p className="text-xs text-slate-500 mb-4">
          Navigate and operate ReachInbox Scheduler at lightning speed.
        </p>
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between px-4 py-2.5 bg-white text-xs">
              <span className="text-slate-700">{s.description}</span>
              <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] rounded font-semibold shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
