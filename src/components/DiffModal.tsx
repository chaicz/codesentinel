import React from 'react';
import { Vulnerability } from '../types';
import { X, Sparkles, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import * as Diff from 'diff';

interface DiffModalProps {
  vulnerability: Vulnerability | null;
  originalCode: string;
  remediatedCode: string;
  explanation: string;
  securityImprovements: string[];
  onApplyPatch: (newCode: string) => void;
  onClose: () => void;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  vulnerability,
  originalCode,
  remediatedCode,
  explanation,
  securityImprovements,
  onApplyPatch,
  onClose,
}) => {
  if (!vulnerability || !remediatedCode) return null;

  const diffResult = Diff.diffLines(originalCode, remediatedCode);

  const handleApply = () => {
    onApplyPatch(remediatedCode);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--success-bg)' }}>
              <Sparkles className="w-4 h-4" style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <div className="text-[11px] font-mono mb-0.5" style={{ color: 'var(--text-muted)' }}>
                Fix: {vulnerability.title} [{vulnerability.cwe}]
              </div>
              <h2 className="text-sm font-semibold text-white">Review Remediated Code</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Explanation */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--success-bg)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--success)' }}>
              <Lock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">How the fix works</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{explanation}</p>
            {securityImprovements?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {securityImprovements.map((imp, idx) => (
                  <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--success)' }}>
                    {imp}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Diff */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Code Changes</span>
              <div className="flex items-center gap-3 text-[10px]">
                <span style={{ color: '#EF4444' }}>− removed</span>
                <span style={{ color: 'var(--success)' }}>+ added</span>
              </div>
            </div>
            <div className="p-3 rounded-lg overflow-x-auto font-mono text-xs max-h-[300px] overflow-y-auto" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              {diffResult.map((part, index) => {
                const isAdded = part.added;
                const isRemoved = part.removed;
                if (!isAdded && !isRemoved) return null;
                return (
                  <div key={index} className="leading-relaxed" style={{ 
                    color: isAdded ? '#86EFAC' : '#F87171',
                    backgroundColor: isAdded ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                  }}>
                    {part.value.split('\n').filter(Boolean).map((line, lIdx) => (
                      <div key={lIdx} className="px-2 py-0.5">
                        <span style={{ color: 'var(--text-muted)' }}>{isAdded ? '+' : '−'}</span> {line}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="text-xs font-medium px-3 py-2 rounded-md cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            id="btn-confirm-apply-patch"
            onClick={handleApply}
            className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-md cursor-pointer"
            style={{ backgroundColor: 'var(--success)', color: 'white' }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Apply Fix</span>
          </button>
        </div>
      </div>
    </div>
  );
};
