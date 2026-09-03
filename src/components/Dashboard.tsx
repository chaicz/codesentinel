import React from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Code2, 
  FileText,
  TrendingUp,
  Zap,
  Bot,
  Clock,
  ArrowRight,
  X,
} from 'lucide-react';
import { Vulnerability, CodeFile } from '../types';

interface DashboardProps {
  files: CodeFile[];
  vulnerabilities: Vulnerability[];
  securityScore: number;
  onClose: () => void;
  onScan: () => void;
  onOpenReport: () => void;
  onOpenSarif: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  files,
  vulnerabilities,
  securityScore,
  onClose,
  onScan,
  onOpenReport,
  onOpenSarif,
}) => {
  const criticalCount = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
  const highCount = vulnerabilities.filter(v => v.severity === 'HIGH').length;
  const mediumCount = vulnerabilities.filter(v => v.severity === 'MEDIUM').length;
  const lowCount = vulnerabilities.filter(v => v.severity === 'LOW').length;

  const totalLines = files.reduce((acc, f) => acc + f.content.split('\n').length, 0);
  const totalBytes = files.reduce((acc, f) => acc + f.content.length, 0);

  const langCounts: Record<string, number> = {};
  files.forEach(f => {
    langCounts[f.language] = (langCounts[f.language] || 0) + 1;
  });
  const topLanguages = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);

  const owaspCounts: Record<string, number> = {};
  vulnerabilities.forEach(v => {
    owaspCounts[v.owaspCategory] = (owaspCounts[v.owaspCategory] || 0) + 1;
  });
  const topOwasp = Object.entries(owaspCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const scoreColor = securityScore >= 90 ? '#22C55E' : securityScore >= 70 ? '#F59E0B' : '#EF4444';

  const statCards = [
    { label: 'Security Score', value: `${securityScore}%`, icon: Shield, color: scoreColor, bg: `${scoreColor}15` },
    { label: 'Files', value: String(files.length), icon: FileText, color: '#14B8A6', bg: 'rgba(20,184,166,0.08)' },
    { label: 'Lines of Code', value: totalLines.toLocaleString(), icon: Code2, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
    { label: 'Vulnerabilities', value: String(vulnerabilities.length), icon: AlertTriangle, color: vulnerabilities.length > 0 ? '#EF4444' : '#22C55E', bg: vulnerabilities.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' },
  ];

  const quickActions = [
    { label: 'Run Deep Scan', desc: 'AI-powered security analysis', icon: Zap, action: onScan, accent: true },
    { label: 'View Report', desc: 'Full security audit report', icon: FileText, action: onOpenReport },
    { label: 'Export SARIF', desc: 'CI/CD integration format', icon: ArrowRight, action: onOpenSarif },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-base font-semibold text-white">Security Overview</h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Analysis across {files.length} file{files.length !== 1 ? 's' : ''}, {totalLines.toLocaleString()} lines</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: card.bg }}>
                    <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                  </div>
                </div>
                <div className="text-lg font-semibold" style={{ color: card.color }}>{card.value}</div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Severity Breakdown */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <h3 className="text-xs font-semibold text-white mb-3">Severity Breakdown</h3>
              <div className="space-y-2">
                {[
                  { label: 'Critical', count: criticalCount, color: '#EF4444' },
                  { label: 'High', count: highCount, color: '#F97316' },
                  { label: 'Medium', count: mediumCount, color: '#EAB308' },
                  { label: 'Low', count: lowCount, color: '#6B7280' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-16 text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${vulnerabilities.length > 0 ? (item.count / vulnerabilities.length) * 100 : 0}%`,
                          backgroundColor: item.color 
                        }} 
                      />
                    </div>
                    <div className="w-5 text-[11px] font-semibold" style={{ color: item.color }}>{item.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <h3 className="text-xs font-semibold text-white mb-3">Languages</h3>
              <div className="space-y-2">
                {topLanguages.length === 0 ? (
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No files yet.</p>
                ) : (
                  topLanguages.map(([lang, count]) => (
                    <div key={lang} className="flex items-center gap-3">
                      <div className="w-20 text-[11px] font-mono capitalize" style={{ color: 'var(--text-muted)' }}>{lang}</div>
                      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(count / files.length) * 100}%`, backgroundColor: 'var(--accent)' }} />
                      </div>
                      <div className="w-5 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>{count}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Top OWASP Categories */}
          {topOwasp.length > 0 && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <h3 className="text-xs font-semibold text-white mb-3">Top OWASP Categories</h3>
              <div className="flex flex-wrap gap-2">
                {topOwasp.map(([cat, count]) => (
                  <span key={cat} className="text-[11px] px-2.5 py-1 rounded-md font-medium" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    {cat} <span className="ml-1" style={{ color: 'var(--accent)' }}>{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className="flex items-center gap-3 p-3 rounded-lg text-left cursor-pointer"
                style={{ 
                  backgroundColor: action.accent ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                  border: action.accent ? '1px solid rgba(20,184,166,0.2)' : '1px solid var(--border)',
                }}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: action.accent ? 'var(--accent)' : 'var(--bg-hover)' }}>
                  <action.icon className="w-4 h-4" style={{ color: action.accent ? 'white' : 'var(--text-muted)' }} />
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: action.accent ? 'var(--accent)' : 'var(--text-primary)' }}>{action.label}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
