/**
 * ============================================================================
 * FILE: CustomRuleBuilder.tsx
 * TYPE: Security Rule Management / Custom Detection Component
 * ============================================================================
 * 
 * PURPOSE:
 * Provides a UI for creating, editing, and managing custom regex-based
 * security detection rules. Allows users to define their own vulnerability
 * patterns beyond built-in detections.
 * 
 * DESIGN NOTES:
 * - Full-screen modal with scrollable rule list
 * - Category-based filtering (Injection, Crypto, Auth, Config, Custom)
 * - Severity color coding (CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=gray)
 * - Pattern testing against active file content
 * - Preset rules provided for common vulnerabilities
 * 
 * BACKEND INTEGRATION:
 * - Rules are stored locally and applied client-side
 * - No API calls (pattern matching done in browser)
 * - Import/Export via JSON format
 * 
 * KEY PROPS:
 * - isOpen, onClose: Modal visibility
 * - activeFile: Current file for pattern testing
 * - onApplyRules: Callback to apply rules to the scanner
 * 
 * PRESET RULES INCLUDED:
 * - Dangerous eval() Usage (CWE-95)
 * - Hardcoded Secrets (CWE-798)
 * - SQL Injection Risk (CWE-89)
 * - Weak Random Number (CWE-330)
 * - Command Injection (CWE-78)
 * - XXE Vulnerability (CWE-611)
 * 
 * CUSTOM RULE STRUCTURE:
 * - id: Unique identifier (format: CR-{timestamp})
 * - name: Human-readable rule name
 * - pattern: Regex pattern for detection
 * - severity: CRITICAL | HIGH | MEDIUM | LOW
 * - owaspCategory: OWASP Top 10 category
 * - cwe: CWE identifier
 * - remediationTip: Suggested fix
 * - language: Target language (or 'all')
 * - enabled: Toggle for active/inactive
 * ============================================================================
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Search,
  Download,
  Upload,
  Copy,
  Edit3,
  Check,
  ChevronDown,
  AlertTriangle,
  Shield,
  Zap,
  Eye,
  EyeOff,
  Filter,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { CustomRule, CodeFile, Severity, OWASPCategory } from '../types';

interface CustomRuleBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: CodeFile;
  onApplyRules: (rules: CustomRule[]) => void;
}

type RuleCategory = 'all' | 'injection' | 'crypto' | 'auth' | 'config' | 'custom';

interface RuleStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  enabled: number;
  disabled: number;
}

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Critical' },
  HIGH: { color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)', label: 'High' },
  MEDIUM: { color: '#EAB308', bg: 'rgba(234, 179, 8, 0.1)', label: 'Medium' },
  LOW: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', label: 'Low' },
  INFO: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Info' },
};

const CATEGORY_CONFIG: Record<RuleCategory, { icon: React.ReactNode; label: string }> = {
  all: { icon: <Shield className="w-3.5 h-3.5" />, label: 'All' },
  injection: { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Injection' },
  crypto: { icon: <Shield className="w-3.5 h-3.5" />, label: 'Crypto' },
  auth: { icon: <Zap className="w-3.5 h-3.5" />, label: 'Auth' },
  config: { icon: <Filter className="w-3.5 h-3.5" />, label: 'Config' },
  custom: { icon: <Edit3 className="w-3.5 h-3.5" />, label: 'Custom' },
};

const PRESET_RULES: Omit<CustomRule, 'id'>[] = [
  { name: 'Dangerous eval() Usage', pattern: 'eval\\s*\\(', severity: 'CRITICAL', owaspCategory: 'A03:2021-Injection', cwe: 'CWE-95', message: 'eval() executes arbitrary code', remediationTip: 'Use JSON.parse() instead', language: 'all', enabled: true },
  { name: 'Hardcoded Secrets', pattern: '(api[_-]?key|password|secret|token)\\s*[:=]\\s*["\'][^"\']{8,}["\']', severity: 'CRITICAL', owaspCategory: 'A02:2021-Cryptographic Failures', cwe: 'CWE-798', message: 'Hardcoded secrets detected', remediationTip: 'Use environment variables', language: 'all', enabled: true },
  { name: 'SQL Injection Risk', pattern: '(execute|query|cursor)\\s*\\(.*["\'].*%.*["\']', severity: 'CRITICAL', owaspCategory: 'A03:2021-Injection', cwe: 'CWE-89', message: 'Potential SQL injection vulnerability', remediationTip: 'Use parameterized queries', language: 'all', enabled: true },
  { name: 'Weak Random Number', pattern: 'Math\\.random\\s*\\(', severity: 'MEDIUM', owaspCategory: 'A02:2021-Cryptographic Failures', cwe: 'CWE-330', message: 'Predictable random numbers', remediationTip: 'Use crypto.getRandomValues()', language: 'all', enabled: true },
  { name: 'Command Injection', pattern: 'exec\\s*\\(|spawn\\s*\\(|system\\s*\\(', severity: 'CRITICAL', owaspCategory: 'A03:2021-Injection', cwe: 'CWE-78', message: 'OS command injection risk', remediationTip: 'Avoid shell commands, use safe APIs', language: 'all', enabled: true },
  { name: 'XXE Vulnerability', pattern: 'XMLParser|XMLReader|loadXML', severity: 'HIGH', owaspCategory: 'A05:2021-Security Misconfiguration', cwe: 'CWE-611', message: 'XML external entity risk', remediationTip: 'Disable XXE in parser config', language: 'all', enabled: true },
];

export const CustomRuleBuilder: React.FC<CustomRuleBuilderProps> = ({
  isOpen,
  onClose,
  activeFile,
  onApplyRules,
}) => {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<RuleCategory>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, number | null>>({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({
    name: '',
    pattern: '',
    severity: 'HIGH',
    owaspCategory: 'A03:2021-Injection',
    cwe: 'CWE-20',
    message: '',
    remediationTip: '',
    language: 'all',
    enabled: true,
  });

  // Calculate statistics
  const stats: RuleStats = useMemo(() => {
    return rules.reduce((acc, rule) => ({
      critical: acc.critical + (rule.severity === 'CRITICAL' ? 1 : 0),
      high: acc.high + (rule.severity === 'HIGH' ? 1 : 0),
      medium: acc.medium + (rule.severity === 'MEDIUM' ? 1 : 0),
      low: acc.low + (rule.severity === 'LOW' ? 1 : 0),
      enabled: acc.enabled + (rule.enabled ? 1 : 0),
      disabled: acc.disabled + (!rule.enabled ? 1 : 0),
    }), { critical: 0, high: 0, medium: 0, low: 0, enabled: 0, disabled: 0 });
  }, [rules]);

  // Filter rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesSearch = !searchQuery || 
        rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.cwe.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (activeCategory === 'all') return true;
      if (activeCategory === 'custom') return !rule.id.startsWith('CR-0');
      
      const categoryMap: Record<string, string[]> = {
        injection: ['A03:2021', 'CWE-89', 'CWE-78', 'CWE-95'],
        crypto: ['A02:2021', 'CWE-330', 'CWE-798'],
        auth: ['A07:2021'],
        config: ['A05:2021', 'A08:2021'],
      };
      
      const keywords = categoryMap[activeCategory] || [];
      return keywords.some(kw => rule.owaspCategory.includes(kw) || rule.cwe.includes(kw));
    });
  }, [rules, searchQuery, activeCategory]);

  const handleTestPattern = (pattern: string, ruleId?: string) => {
    if (!pattern) {
      if (ruleId) setTestResults(prev => ({ ...prev, [ruleId]: null }));
      return;
    }
    try {
      const regex = new RegExp(pattern, 'g');
      const matches = activeFile.content.match(regex);
      const count = matches ? matches.length : 0;
      if (ruleId) {
        setTestResults(prev => ({ ...prev, [ruleId]: count }));
      }
      return count;
    } catch {
      if (ruleId) setTestResults(prev => ({ ...prev, [ruleId]: -1 }));
      return -1;
    }
  };

  const handleAddRule = () => {
    if (!newRule.name || !newRule.pattern) return;
    
    const rule: CustomRule = {
      id: `CR-${Date.now()}`,
      name: newRule.name,
      pattern: newRule.pattern,
      severity: (newRule.severity as Severity) || 'HIGH',
      owaspCategory: (newRule.owaspCategory as OWASPCategory) || 'A03:2021-Injection',
      cwe: newRule.cwe || 'CWE-20',
      message: newRule.message || '',
      remediationTip: newRule.remediationTip || '',
      language: newRule.language || 'all',
      enabled: true,
    };

    setRules([...rules, rule]);
    setNewRule({
      name: '',
      pattern: '',
      severity: 'HIGH',
      owaspCategory: 'A03:2021-Injection',
      cwe: 'CWE-20',
      message: '',
      remediationTip: '',
      language: 'all',
      enabled: true,
    });
    setIsCreating(false);
  };

  const handleUpdateRule = (id: string, updates: Partial<CustomRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    setEditingRuleId(null);
  };

  const handleDuplicateRule = (rule: CustomRule) => {
    const newRule: CustomRule = {
      ...rule,
      id: `CR-${Date.now()}`,
      name: `${rule.name} (Copy)`,
    };
    setRules([...rules, newRule]);
  };

  const handleToggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleExportRules = () => {
    const dataStr = JSON.stringify(rules, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codesentinel-rules-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRules = () => {
    try {
      const imported = JSON.parse(importJson) as CustomRule[];
      if (Array.isArray(imported)) {
        const validRules = imported.map((r, i) => ({
          ...r,
          id: r.id || `CR-IMPORT-${Date.now()}-${i}`,
        }));
        setRules([...rules, ...validRules]);
        setShowImportModal(false);
        setImportJson('');
      }
    } catch {
      alert('Invalid JSON format');
    }
  };

  const handleAddPreset = (preset: Omit<CustomRule, 'id'>) => {
    const rule: CustomRule = {
      ...preset,
      id: `CR-PRESET-${Date.now()}`,
    };
    setRules([...rules, rule]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-dim)' }}
            >
              <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Custom Rules
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {stats.enabled} active · {rules.length} total
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ 
                backgroundColor: showStats ? 'var(--accent-dim)' : 'transparent',
                color: showStats ? 'var(--accent)' : 'var(--text-muted)'
              }}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportRules}
              disabled={rules.length === 0}
              className="p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              style={{ color: 'var(--text-muted)' }}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        {showStats && (
          <div 
            className="px-6 py-4 grid grid-cols-6 gap-3"
            style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}
          >
            {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
              <div key={sev} className="text-center">
                <div 
                  className="text-xl font-bold"
                  style={{ color: SEVERITY_CONFIG[sev.toUpperCase() as Severity].color }}
                >
                  {stats[sev]}
                </div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {sev}
                </div>
              </div>
            ))}
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: 'var(--success)' }}>{stats.enabled}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>active</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: 'var(--text-muted)' }}>{stats.disabled}</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>disabled</div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="px-6 py-3 space-y-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search rules by name, pattern, or CWE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm"
              style={{ 
                backgroundColor: 'var(--bg-elevated)', 
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(Object.keys(CATEGORY_CONFIG) as RuleCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
                style={{
                  backgroundColor: activeCategory === cat ? 'var(--accent-dim)' : 'transparent',
                  color: activeCategory === cat ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {CATEGORY_CONFIG[cat].icon}
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Rules */}
        {rules.length === 0 && !isCreating && (
          <div className="px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <Shield className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No custom rules yet</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Start with a preset or create your own rule</p>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESET_RULES.slice(0, 4).map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handleAddPreset(preset)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  style={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)'
                  }}
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredRules.map(rule => (
            <div
              key={rule.id}
              className="px-6 py-4 transition-colors"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {editingRuleId === rule.id ? (
                <RuleEditor
                  rule={rule}
                  onSave={(updates) => handleUpdateRule(rule.id, updates)}
                  onCancel={() => setEditingRuleId(null)}
                  onTest={(pattern) => handleTestPattern(pattern)}
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className="p-1 rounded transition-colors cursor-pointer"
                        style={{ color: rule.enabled ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        {rule.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <span 
                        className="text-sm font-medium"
                        style={{ color: rule.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        {rule.name}
                      </span>
                      <span 
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                        style={{ 
                          backgroundColor: SEVERITY_CONFIG[rule.severity as Severity].bg,
                          color: SEVERITY_CONFIG[rule.severity as Severity].color,
                        }}
                      >
                        {rule.severity}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {rule.cwe}
                      </span>
                    </div>
                    <code 
                      className="text-xs font-mono block mb-2 truncate"
                      style={{ color: 'var(--text-code)' }}
                    >
                      {rule.pattern}
                    </code>
                    {testResults[rule.id] !== undefined && testResults[rule.id] !== null && (
                      <div className="flex items-center gap-1 text-[11px]">
                        <span style={{ color: testResults[rule.id] > 0 ? '#EAB308' : 'var(--success)' }}>
                          {testResults[rule.id] > 0 ? `${testResults[rule.id]} matches` : 'No matches'}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>in {activeFile.name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTestPattern(rule.pattern, rule.id)}
                      className="p-1.5 rounded transition-colors cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                      title="Test pattern"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicateRule(rule)}
                      className="p-1.5 rounded transition-colors cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingRuleId(rule.id)}
                      className="p-1.5 rounded transition-colors cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded transition-colors cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create New Rule Form */}
        {isCreating && (
          <div 
            className="p-6"
            style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    Rule Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Banned eval()"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: 'var(--bg-base)', 
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    CWE ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., CWE-95"
                    value={newRule.cwe}
                    onChange={(e) => setNewRule({ ...newRule, cwe: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                    style={{ 
                      backgroundColor: 'var(--bg-base)', 
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Regex Pattern
                </label>
                <input
                  type="text"
                  placeholder="e.g., eval\s*\("
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ 
                    backgroundColor: 'var(--bg-base)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-code)',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    Severity
                  </label>
                  <div className="relative">
                    <select
                      value={newRule.severity}
                      onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as Severity })}
                      className="w-full px-3 py-2 rounded-lg text-sm appearance-none cursor-pointer"
                      style={{ 
                        backgroundColor: 'var(--bg-base)', 
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    >
                      {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(s => (
                        <option key={s} value={s}>{SEVERITY_CONFIG[s].label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    OWASP Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., A03:2021-Injection"
                    value={newRule.owaspCategory}
                    onChange={(e) => setNewRule({ ...newRule, owaspCategory: e.target.value as OWASPCategory })}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ 
                      backgroundColor: 'var(--bg-base)', 
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[11px] uppercase tracking-wider font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                  Remediation Tip
                </label>
                <input
                  type="text"
                  placeholder="How to fix this issue..."
                  value={newRule.remediationTip}
                  onChange={(e) => setNewRule({ ...newRule, remediationTip: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-base)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  style={{ 
                    backgroundColor: 'var(--bg-hover)', 
                    color: 'var(--text-secondary)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={!newRule.name || !newRule.pattern}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer"
                  style={{ 
                    backgroundColor: 'var(--accent)', 
                    color: 'white'
                  }}
                >
                  <Check className="w-4 h-4" />
                  Create Rule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div 
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ 
              backgroundColor: 'var(--accent)', 
              color: 'white'
            }}
          >
            <Plus className="w-4 h-4" />
            New Rule
          </button>
          
          <button
            onClick={() => { onApplyRules(rules.filter(r => r.enabled)); onClose(); }}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border)'
            }}
          >
            Apply {rules.filter(r => r.enabled).length} Rules
          </button>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div 
            className="absolute inset-0 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false); }}
          >
            <div 
              className="w-full max-w-lg rounded-xl p-6"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Import Rules</h3>
              <textarea
                placeholder='[{"name": "Rule Name", "pattern": "regex", ...}]'
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                className="w-full h-40 px-3 py-2 rounded-lg text-sm font-mono resize-none"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportRules}
                  className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: 'white' }}
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Inline Rule Editor Component
interface RuleEditorProps {
  rule: CustomRule;
  onSave: (updates: Partial<CustomRule>) => void;
  onCancel: () => void;
  onTest: (pattern: string) => void;
}

const RuleEditor: React.FC<RuleEditorProps> = ({ rule, onSave, onCancel, onTest }) => {
  const [editedRule, setEditedRule] = useState(rule);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={editedRule.name}
          onChange={(e) => setEditedRule({ ...editedRule, name: e.target.value })}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
        />
        <input
          type="text"
          value={editedRule.cwe}
          onChange={(e) => setEditedRule({ ...editedRule, cwe: e.target.value })}
          className="px-3 py-2 rounded-lg text-sm font-mono"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
        />
      </div>
      <input
        type="text"
        value={editedRule.pattern}
        onChange={(e) => setEditedRule({ ...editedRule, pattern: e.target.value })}
        className="w-full px-3 py-2 rounded-lg text-sm font-mono"
        style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-code)', outline: 'none' }}
      />
      <div className="flex items-center gap-2">
        <select
          value={editedRule.severity}
          onChange={(e) => setEditedRule({ ...editedRule, severity: e.target.value as Severity })}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
        >
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => onTest(editedRule.pattern)}
          className="px-3 py-2 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}
        >
          Test
        </button>
        <div className="flex-1" />
        <button onClick={onCancel} className="px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
        <button 
          onClick={() => onSave(editedRule)} 
          className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          <Check className="w-3.5 h-3.5" /> Save
        </button>
      </div>
    </div>
  );
};
