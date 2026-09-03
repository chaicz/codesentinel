import React from 'react';
import { 
  Play, 
  Sparkles, 
  Bot, 
  Settings2,
  LogOut,
  Plus,
  LayoutGrid,
  FileCode,
  Download,
  Wrench,
  FileCheck2,
  Cloud,
  BarChart3,
  Zap,
  ChevronDown,
  FolderOpen,
} from 'lucide-react';
import { AIProvider, AuthUser, CodeFile, Vulnerability } from '../types';

interface HeaderProps {
  activeFile: CodeFile;
  files: CodeFile[];
  onSelectFile: (fileId: string) => void;
  onNewFile: () => void;
  onScan: () => void;
  isScanning: boolean;
  liveScanEnabled: boolean;
  onToggleLiveScan: () => void;
  securityScore: number;
  vulnerabilities: Vulnerability[];
  onOpenSarif: () => void;
  onOpenReport: () => void;
  onOpenCloudAudit: () => void;
  onOpenRules: () => void;
  onToggleCopilot: () => void;
  isCopilotOpen: boolean;
  onRunCode?: () => void;
  isRunning?: boolean;
  currentUser?: AuthUser;
  onLogout?: () => void;
  aiProvider?: AIProvider;
  aiApiKeyConfigured?: boolean;
  onOpenAISettings?: () => void;
  onOpenDashboard?: () => void;
  isDashboardOpen?: boolean;
  onOpenProjectManager?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeFile,
  files,
  onSelectFile,
  onNewFile,
  onScan,
  isScanning,
  liveScanEnabled,
  onToggleLiveScan,
  securityScore,
  vulnerabilities,
  onOpenSarif,
  onOpenReport,
  onOpenCloudAudit,
  onOpenRules,
  onToggleCopilot,
  isCopilotOpen,
  onRunCode,
  isRunning,
  currentUser,
  onLogout,
  aiProvider,
  aiApiKeyConfigured,
  onOpenAISettings,
  onOpenDashboard,
  isDashboardOpen,
  onOpenProjectManager,
}) => {
  const criticalCount = vulnerabilities.filter((v) => v.severity === 'CRITICAL').length;
  const highCount = vulnerabilities.filter((v) => v.severity === 'HIGH').length;

  const getScoreColor = () => {
    if (securityScore >= 90) return 'text-emerald-400';
    if (securityScore >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <header className="h-12 border-b border-[#27272A] bg-[#111114] flex items-center px-4 gap-4 select-none">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">
          Sentinel
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ 
          color: 'var(--text-muted)', 
          borderColor: 'var(--border)', 
          backgroundColor: 'var(--bg-elevated)' 
        }}>
          IDE
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#27272A]" />

      {/* File Switcher */}
      <div className="flex items-center gap-1.5">
        <FileCode className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <select
          id="file-selector"
          value={activeFile.id}
          onChange={(e) => {
            if (e.target.value === '__new__') {
              onNewFile();
            } else {
              onSelectFile(e.target.value);
            }
          }}
          aria-label="Select source file"
          className="bg-transparent text-xs text-[var(--text-secondary)] focus:outline-none cursor-pointer"
        >
          {files.map((file) => (
            <option key={file.id} value={file.id} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
              {file.name}
            </option>
          ))}
          <option value="__new__" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent)' }}>
            + New File...
          </option>
        </select>
      </div>

      {/* Center - Actions */}
      <div className="flex items-center gap-1 ml-auto">
        {onRunCode && (
          <button
            id="header-btn-run-code"
            onClick={onRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all disabled:opacity-40 cursor-pointer"
            style={{ 
              backgroundColor: isRunning ? 'var(--bg-elevated)' : '#166534',
              color: 'white',
            }}
            title="Execute code (Ctrl+Enter)"
          >
            {isRunning ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                <span>Running</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Run</span>
              </>
            )}
          </button>
        )}

        <button
          id="btn-deep-ai-scan"
          onClick={onScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all disabled:opacity-40 cursor-pointer"
          style={{ 
            backgroundColor: isScanning ? 'var(--bg-elevated)' : 'var(--accent-dim)',
            color: isScanning ? 'var(--text-muted)' : 'var(--accent)',
            border: '1px solid rgba(20,184,166,0.2)',
          }}
          title="Run AI security analysis"
        >
          {isScanning ? (
            <>
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              <span>Scanning</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              <span>Scan</span>
            </>
          )}
        </button>

        <button
          id="toggle-live-scan"
          onClick={onToggleLiveScan}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
          style={{ 
            backgroundColor: liveScanEnabled ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            color: liveScanEnabled ? 'var(--accent)' : 'var(--text-muted)',
            border: '1px solid',
            borderColor: liveScanEnabled ? 'rgba(20,184,166,0.3)' : 'var(--border)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ 
            backgroundColor: liveScanEnabled ? 'var(--accent)' : 'var(--text-muted)',
          }} />
          <span>Live</span>
        </button>
      </div>

      {/* Score + Issues */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <span className={`text-sm font-semibold ${getScoreColor()}`}>
          {securityScore}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>score</span>
        {criticalCount + highCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ 
            backgroundColor: 'var(--critical-bg)', 
            color: 'var(--critical)',
            border: '1px solid var(--critical-border)'
          }}>
            {criticalCount + highCount} issues
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#27272A]" />

      {/* Feature Buttons */}
      <div className="hidden lg:flex items-center gap-0.5">
        {onOpenProjectManager && (
          <button
            onClick={onOpenProjectManager}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
            style={{ 
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
            }}
            title="Project Manager"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>
        )}
        {onOpenDashboard && (
          <button
            onClick={onOpenDashboard}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
            style={{ 
              backgroundColor: isDashboardOpen ? 'var(--accent-dim)' : 'transparent',
              color: isDashboardOpen ? 'var(--accent)' : 'var(--text-muted)',
            }}
            title="Dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
        )}
        <button
          id="btn-cloud-audit"
          onClick={onOpenCloudAudit}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title="Cloud Audit"
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Cloud</span>
        </button>
        <button
          id="btn-audit-report"
          onClick={onOpenReport}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title="Audit Report"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Report</span>
        </button>
        <button
          id="btn-export-sarif"
          onClick={onOpenSarif}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title="Export SARIF"
        >
          <Download className="w-3.5 h-3.5" />
          <span>SARIF</span>
        </button>
        <button
          id="btn-custom-rules"
          onClick={onOpenRules}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title="Custom Rules"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Rules</span>
        </button>
      </div>

      {/* AI Buttons */}
      <div className="flex items-center gap-1">
        {onOpenAISettings && (
          <button
            id="btn-ai-settings"
            onClick={onOpenAISettings}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
            style={{ 
              color: !aiApiKeyConfigured ? '#F59E0B' : 'var(--text-muted)',
              backgroundColor: !aiApiKeyConfigured ? 'rgba(245,158,11,0.08)' : 'transparent',
              border: !aiApiKeyConfigured ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
            }}
            title={!aiApiKeyConfigured ? 'Configure AI' : `AI: ${aiProvider}`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            {!aiApiKeyConfigured && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          </button>
        )}
        <button
          id="btn-toggle-copilot"
          onClick={onToggleCopilot}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-all cursor-pointer"
          style={{ 
            backgroundColor: isCopilotOpen ? 'var(--accent-dim)' : 'transparent',
            color: isCopilotOpen ? 'var(--accent)' : 'var(--text-muted)',
            border: isCopilotOpen ? '1px solid rgba(20,184,166,0.3)' : '1px solid transparent',
          }}
          title="AI Copilot"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Copilot</span>
        </button>
      </div>

      {/* User */}
      {currentUser && (
        <div className="flex items-center gap-2 pl-2 border-l border-[#27272A]">
          <span className="text-xs font-medium hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
            {currentUser.username}
          </span>
          {onLogout && (
            <button
              id="btn-logout"
              onClick={onLogout}
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};
