import React, { useState } from 'react';
import { 
  Play, 
  Terminal, 
  Trash2, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  AlertTriangle, 
  ShieldAlert,
  Cpu,
  Clock,
  X,
} from 'lucide-react';
import { ExecutionResult } from '../types';

interface OutputPanelProps {
  isRunning: boolean;
  onRunCode: () => void;
  result: ExecutionResult | null;
  onClear: () => void;
  stdinInput: string;
  onStdinChange: (val: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  activeLanguage: string;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  isRunning,
  onRunCode,
  result,
  onClear,
  stdinInput,
  onStdinChange,
  isExpanded,
  onToggleExpand,
  activeLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'security'>('console');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!result) return;
    const text = `=== Output (${result.timestamp}) ===\nExit: ${result.exitCode}\nDuration: ${result.durationMs}ms\n\n${result.stdout}\n${result.stderr ? '\n[STDERR]\n' + result.stderr : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasOutput = Boolean(result && (result.stdout || result.stderr));
  const hasAlerts = Boolean(result?.securityAlerts?.length);

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{ 
        height: isExpanded ? '384px' : '224px',
        backgroundColor: 'var(--bg-base)',
        borderTop: '1px solid var(--border)',
        transition: 'height 200ms ease',
      }}
    >
      {/* Tab Bar */}
      <div className="h-9 px-3 flex items-center justify-between gap-2 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setActiveTab('console')}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded cursor-pointer"
            style={{ 
              color: activeTab === 'console' ? 'var(--text-primary)' : 'var(--text-muted)',
              backgroundColor: activeTab === 'console' ? 'var(--bg-elevated)' : 'transparent',
            }}
          >
            <Terminal className="w-3 h-3" />
            <span>Console</span>
            {result && (
              <span className="text-[10px] font-mono" style={{ 
                color: result.exitCode === 0 ? 'var(--success)' : 'var(--error)' 
              }}>
                {result.exitCode}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded cursor-pointer"
            style={{ 
              color: activeTab === 'security' ? 'var(--text-primary)' : 'var(--text-muted)',
              backgroundColor: activeTab === 'security' ? 'var(--bg-elevated)' : 'transparent',
            }}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Security</span>
            {hasAlerts && (
              <span className="text-[10px] font-semibold px-1 py-0.5 rounded" style={{ 
                backgroundColor: 'var(--high-bg)', color: 'var(--high)' 
              }}>
                {result?.securityAlerts?.length}
              </span>
            )}
          </button>
        </div>

        {/* Meta + Actions */}
        <div className="flex items-center gap-2">
          {result && !isRunning && (
            <div className="hidden sm:flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {result.durationMs}ms
              </span>
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                <span className="truncate max-w-[120px]">{result.engine?.split('(')[0]}</span>
              </span>
            </div>
          )}

          <button
            id="output-btn-run"
            onClick={onRunCode}
            disabled={isRunning}
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: '#166534', color: 'white' }}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run</span>
          </button>

          <button
            onClick={handleCopy}
            disabled={!hasOutput}
            className="p-1 rounded cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)' }}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClear}
            disabled={!hasOutput && !isRunning}
            className="p-1 rounded cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleExpand}
            className="p-1 rounded cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed">
        {/* Console */}
        {activeTab === 'console' && (
          <div className="p-3">
            {isRunning && (
              <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--accent)' }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                <span>Executing {activeLanguage.toUpperCase()}...</span>
              </div>
            )}

            {!isRunning && !result && (
              <div className="flex items-center justify-center h-full text-center" style={{ color: 'var(--text-muted)' }}>
                <div>
                  <Terminal className="w-5 h-5 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Press <strong className="text-[var(--text-secondary)]">Run</strong> or <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>Ctrl+Enter</kbd> to execute.</p>
                </div>
              </div>
            )}

            {result && !isRunning && (
              <div className="space-y-2">
                {result.stdout && (
                  <pre className="whitespace-pre-wrap" style={{ color: '#86EFAC' }}>
                    {result.stdout}
                  </pre>
                )}
                {result.stderr && (
                  <div className="p-2.5 rounded-md" style={{ backgroundColor: 'var(--error-bg)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--error)' }}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="font-semibold text-[11px]">Error</span>
                    </div>
                    <pre className="whitespace-pre-wrap" style={{ color: '#FCA5A5' }}>{result.stderr}</pre>
                  </div>
                )}
                <div className="pt-2 border-t border-[#27272A] flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <span>Exit code: <strong className={result.exitCode === 0 ? 'text-emerald-400' : 'text-red-400'}>{result.exitCode}</strong></span>
                  <span>{result.timestamp}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security */}
        {activeTab === 'security' && (
          <div className="p-3 space-y-1.5">
            {!hasAlerts ? (
              <div className="flex items-center gap-2 p-2.5 rounded-md" style={{ backgroundColor: 'var(--success-bg)' }}>
                <ShieldAlert className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} />
                <span className="text-xs" style={{ color: 'var(--success)' }}>No runtime security violations detected.</span>
              </div>
            ) : (
              result?.securityAlerts?.map((alert, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-md" style={{ backgroundColor: 'var(--high-bg)', border: '1px solid var(--high-border)' }}>
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--high)' }} />
                  <span className="text-xs" style={{ color: 'var(--high)' }}>{alert}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
