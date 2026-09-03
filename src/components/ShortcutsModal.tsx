import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'Enter'], action: 'Run code' },
    { keys: ['Ctrl', 'S'], action: 'Save (auto-save enabled)' },
    { keys: ['Ctrl', 'F'], action: 'Find in editor' },
    { keys: ['Ctrl', 'Z'], action: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
    { keys: ['Ctrl', 'L'], action: 'Clear editor' },
    { keys: ['Ctrl', '/'], action: 'Toggle comment' },
    { keys: ['Alt', '↑/↓'], action: 'Move line up/down' },
    { keys: ['Ctrl', 'D'], action: 'Select next occurrence' },
    { keys: ['Ctrl', 'Space'], action: 'Trigger suggestions' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-1">
            {shortcuts.map((s) => (
              <div key={s.action} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.action}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((key, i) => (
                    <React.Fragment key={key}>
                      {i > 0 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+</span>}
                      <kbd className="text-[11px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        {key}
                      </kbd>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
