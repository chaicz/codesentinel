import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PRESET_FILES } from './data/presetFiles';
import { CodeFile, Vulnerability, CustomRule, ExecutionResult, AuthUser, AIProvider, AI_PROVIDERS, Project } from './types';
import { runStaticSecurityScan, calculateSecurityScore } from './utils/staticAnalyzer';
import { Header } from './components/Header';
import { CodeEditor } from './components/CodeEditor';
import { VulnerabilityList } from './components/VulnerabilityList';
import { VulnerabilityDetailModal } from './components/VulnerabilityDetailModal';
import { DiffModal } from './components/DiffModal';
import { ExploitSimulatorModal } from './components/ExploitSimulatorModal';
import { SecurityCopilotChat } from './components/SecurityCopilotChat';
import { CloudAuditPanel } from './components/CloudAuditPanel';
import { CustomRuleBuilder } from './components/CustomRuleBuilder';
import { AuditReportModal } from './components/AuditReportModal';
import { SarifModal } from './components/SarifModal';
import { NewFileModal } from './components/NewFileModal';
import { LoginScreen } from './components/LoginScreen';
import { AISettingsModal } from './components/AISettingsModal';
import { Dashboard } from './components/Dashboard';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ProjectManager } from './components/ProjectManager';

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [files, setFiles] = useState<CodeFile[]>(PRESET_FILES);
  const [activeFileId, setActiveFileId] = useState<string>(PRESET_FILES[0]?.id || 'starter-main');
  const [liveScanEnabled, setLiveScanEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  // Code Execution
  const [isRunning, setIsRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [isOutputExpanded, setIsOutputExpanded] = useState(false);
  const [stdinInput, setStdinInput] = useState('');

  // Vulnerabilities
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [detailModalVuln, setDetailModalVuln] = useState<Vulnerability | null>(null);
  const [exploitModalVuln, setExploitModalVuln] = useState<Vulnerability | null>(null);
  
  // Diff Modal
  const [diffState, setDiffState] = useState<{
    vulnerability: Vulnerability | null;
    originalCode: string;
    remediatedCode: string;
    explanation: string;
    securityImprovements: string[];
  } | null>(null);

  // Modals
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isCloudAuditOpen, setIsCloudAuditOpen] = useState(false);
  const [isCustomRulesOpen, setIsCustomRulesOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSarifOpen, setIsSarifOpen] = useState(false);
  const [isNewFileOpen, setIsNewFileOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

  // Custom Rules
  const [customRules, setCustomRules] = useState<CustomRule[]>([]);

  const activeFile = files.find((f) => f.id === activeFileId) || files[0] || PRESET_FILES[0];
  const debounceTimerRef = useRef<any>(null);

  // Auth check
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data?.user) setAuthUser(data.user);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setAuthUser(null);
  };

  const handleSaveAISettings = (config: { provider: AIProvider; apiKey: string; model: string }) => {
    setAuthUser((prev) => prev ? {
      ...prev,
      aiConfig: { provider: config.provider, apiKey: config.apiKey, model: config.model },
    } : prev);
  };

  const aiProvider = authUser?.aiConfig?.provider as AIProvider | undefined;
  const aiApiKeyConfigured = Boolean(authUser?.aiConfig?.apiKey);
  const currentAIConfig = authUser?.aiConfig || AI_PROVIDERS[0];

  // Static scan
  const executeLocalScan = useCallback((content: string, language: string, fileId: string) => {
    const staticVulns = runStaticSecurityScan(content, language);
    const customFindings: Vulnerability[] = [];
    for (const cr of customRules.filter((r) => r.enabled)) {
      try {
        const regex = new RegExp(cr.pattern, 'gm');
        const match = regex.exec(content);
        if (match) {
          const lines = content.substring(0, match.index).split('\n');
          customFindings.push({
            id: `custom-${cr.id}-${lines.length}`,
            title: cr.name,
            severity: cr.severity,
            owaspCategory: cr.owaspCategory,
            cwe: cr.cwe,
            cvssScore: cr.severity === 'CRITICAL' ? 9.0 : cr.severity === 'HIGH' ? 7.5 : 5.0,
            lineStart: lines.length,
            lineEnd: lines.length,
            vulnerableSnippet: match[0],
            description: cr.message,
            impact: 'Custom organizational security policy violation.',
            exploitScenario: 'Policy rule violation detected.',
            remediation: cr.remediationTip,
            confidence: 'HIGH',
            source: 'STATIC_ANALYZER',
          });
        }
      } catch {}
    }
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, vulnerabilities: [...staticVulns, ...customFindings] } : f));
  }, [customRules]);

  useEffect(() => {
    if (activeFile) executeLocalScan(activeFile.content, activeFile.language, activeFile.id);
  }, [activeFile?.id, executeLocalScan]);

  const handleCodeChange = (newContent: string) => {
    setFiles((prev) => prev.map((f) => f.id === activeFile.id ? { ...f, content: newContent } : f));
    if (liveScanEnabled) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        executeLocalScan(newContent, activeFile.language, activeFile.id);
      }, 350);
    }
  };

  const handleChangeLanguage = (newLang: string) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id === activeFile.id) {
        const extMap: Record<string, string> = {
          python: '.py', javascript: '.js', typescript: '.ts', c: '.c', cpp: '.cpp',
          go: '.go', java: '.java', csharp: '.cs', php: '.php', ruby: '.rb',
          rust: '.rs', sql: '.sql', bash: '.sh', dockerfile: 'Dockerfile',
          yaml: '.yaml', json: '.json', html: '.html'
        };
        let newName = f.name;
        if (extMap[newLang] && !newName.endsWith(extMap[newLang])) {
          const base = newName.split('.')[0] || 'code';
          newName = newLang === 'dockerfile' ? 'Dockerfile' : `${base}${extMap[newLang]}`;
        }
        return { ...f, language: newLang, name: newName };
      }
      return f;
    }));
    executeLocalScan(activeFile.content, newLang, activeFile.id);
  };

  // Deep AI Scan
  const handleDeepAIScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/analyze-code', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeFile.content, language: activeFile.language, fileName: activeFile.name, staticFindings: activeFile.vulnerabilities }),
      });
      if (res.status === 401) { setAuthUser(null); return; }
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => prev.map((f) =>
          f.id === activeFile.id ? { ...f, vulnerabilities: data.findings?.length ? data.findings : f.vulnerabilities, isScanned: true, lastScannedAt: new Date().toISOString() } : f
        ));
      }
    } catch (err) { console.error('AI Scan Error:', err); }
    finally { setIsScanning(false); }
  };

  // Auto-Fix
  const handleAutoFix = async (vuln: Vulnerability) => {
    setIsFixing(true);
    try {
      const res = await fetch('/api/suggest-fix', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeFile.content, language: activeFile.language, fileName: activeFile.name, vulnerability: vuln }),
      });
      if (res.status === 401) { setAuthUser(null); return; }
      if (res.ok) {
        const data = await res.json();
        setDiffState({ vulnerability: vuln, originalCode: activeFile.content, remediatedCode: data.fullRemediatedCode, explanation: data.explanation, securityImprovements: data.securityImprovements || [] });
      } else {
        generateHeuristicPatch(vuln);
      }
    } catch {
      generateHeuristicPatch(vuln);
    } finally { setIsFixing(false); }
  };

  const generateHeuristicPatch = (vuln: Vulnerability) => {
    let patched = activeFile.content;
    let explanation = 'Applied defense-in-depth sanitization.';
    let improvements = ['Input parameterization', 'Bound checking'];
    if (vuln.cwe === 'CWE-89') {
      patched = patched.replace(/query\s*=\s*f["'].*WHERE.*['"]\s*\n\s*cursor\.execute\(query\)/g,
        `# Remediated: Parameterized SQL\n    query = "SELECT id, amount FROM transactions WHERE user_id = ? AND is_deleted = 0"\n    cursor.execute(query, (user_id,))`);
      explanation = 'Replaced string interpolation with parameterized SQL query.';
      improvements = ['Parameterized SQL', 'Strict type binding'];
    } else if (vuln.cwe === 'CWE-918') {
      patched = patched.replace(/response\s*=\s*requests\.post\(webhook_url,[^)]+\)/g,
        `# Remediated: SSRF validation\n    import urllib.parse\n    parsed = urllib.parse.urlparse(webhook_url)\n    if parsed.hostname in ["169.254.169.254","localhost","127.0.0.1"] or parsed.scheme != "https":\n        return jsonify({"error":"Forbidden"}), 400\n    response = requests.post(webhook_url, json=payload, timeout=5)`);
      explanation = 'Enforced HTTPS and blocked link-local cloud metadata addresses.';
      improvements = ['Cloud metadata blocking', 'HTTPS enforcement'];
    } else if (vuln.cwe === 'CWE-798') {
      patched = patched.replace(/"[A-Z_]*API_[A-Z_]*"\s*=\s*["'][^"']+["']/g, `"SECRET_KEY" = os.environ.get("SECRET_KEY", "")`);
      explanation = 'Extracted hardcoded secrets to environment variables.';
      improvements = ['Environment variable secrets', 'Zero hardcoded secrets'];
    }
    setDiffState({ vulnerability: vuln, originalCode: activeFile.content, remediatedCode: patched, explanation, securityImprovements: improvements });
  };

  const handleApplyPatch = (newCode: string) => {
    setFiles((prev) => prev.map((f) => f.id === activeFile.id ? { ...f, content: newCode } : f));
    executeLocalScan(newCode, activeFile.language, activeFile.id);
    setSelectedVulnerability(null);
  };

  const handleResetToDefault = () => {
    const original = PRESET_FILES.find((f) => f.id === activeFile.id);
    if (original) {
      setFiles((prev) => prev.map((f) => f.id === activeFile.id ? { ...original } : f));
      executeLocalScan(original.content, original.language, original.id);
    } else {
      setFiles((prev) => prev.map((f) => f.id === activeFile.id ? { ...f, content: `// ${f.name}\n` } : f));
    }
  };

  // Run Code
  const handleRunCode = async () => {
    setIsRunning(true);
    setIsOutputOpen(true);
    try {
      const res = await fetch('/api/run-code', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activeFile.content, language: activeFile.language, fileName: activeFile.name, stdinInput }),
      });
      if (res.status === 401) { setAuthUser(null); return; }
      if (res.ok) {
        const data: ExecutionResult = await res.json();
        setExecutionResult(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setExecutionResult({ stdout: '', stderr: errData.error || 'Execution failed.', exitCode: 1, durationMs: 0, runtimeType: 'NATIVE_EXECUTION', engine: 'Process Runtime', timestamp: new Date().toLocaleTimeString() });
      }
    } catch (err: any) {
      setExecutionResult({ stdout: '', stderr: `Error: ${err.message}`, exitCode: 1, durationMs: 0, runtimeType: 'NATIVE_EXECUTION', engine: 'Process Runtime', timestamp: new Date().toLocaleTimeString() });
    } finally { setIsRunning(false); }
  };

  const handleClearOutput = () => setExecutionResult(null);

  const securityScore = calculateSecurityScore(activeFile.vulnerabilities || []);

  // Handle loading a project from ProjectManager
  const handleLoadProject = (project: Project) => {
    if (project.files.length > 0) {
      // Load the first file from the project
      const firstFile = project.files[0];
      const newCodeFile: CodeFile = {
        id: `proj_${project.id}_${firstFile.id}`,
        name: firstFile.name,
        language: firstFile.language,
        category: project.name,
        description: `From project: ${project.name}`,
        content: firstFile.content,
        vulnerabilities: [],
      };
      setFiles((prev) => [...prev, newCodeFile]);
      setActiveFileId(newCodeFile.id);
      executeLocalScan(newCodeFile.content, newCodeFile.language, newCodeFile.id);
    }
  };

  // Keyboard shortcut: Ctrl+Shift+P for shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !isOutputOpen) {
        setIsDashboardOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOutputOpen]);

  if (!authChecked) {
    return <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (!authUser) {
    return <LoginScreen onAuthenticated={setAuthUser} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Header
        activeFile={activeFile}
        files={files}
        onSelectFile={(fileId) => { setActiveFileId(fileId); setSelectedVulnerability(null); }}
        onNewFile={() => setIsNewFileOpen(true)}
        onScan={handleDeepAIScan}
        isScanning={isScanning}
        liveScanEnabled={liveScanEnabled}
        onToggleLiveScan={() => setLiveScanEnabled(!liveScanEnabled)}
        securityScore={securityScore}
        vulnerabilities={activeFile.vulnerabilities || []}
        onOpenSarif={() => setIsSarifOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenCloudAudit={() => setIsCloudAuditOpen(true)}
        onOpenRules={() => setIsCustomRulesOpen(true)}
        onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
        isCopilotOpen={isCopilotOpen}
        onRunCode={handleRunCode}
        isRunning={isRunning}
        currentUser={authUser}
        onLogout={handleLogout}
        aiProvider={aiProvider}
        aiApiKeyConfigured={aiApiKeyConfigured}
        onOpenAISettings={() => setIsAISettingsOpen(true)}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        isDashboardOpen={isDashboardOpen}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
      />

      {/* Main Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        <div className="lg:col-span-7 xl:col-span-8 h-full min-h-[400px]">
          <CodeEditor
            file={activeFile}
            onChange={handleCodeChange}
            vulnerabilities={activeFile.vulnerabilities || []}
            selectedVulnerability={selectedVulnerability}
            onSelectVulnerability={(v) => setSelectedVulnerability(v)}
            onAutoFix={handleAutoFix}
            onSimulateExploit={(v) => setExploitModalVuln(v)}
            onResetToDefault={handleResetToDefault}
            isFixing={isFixing}
            onRunCode={handleRunCode}
            isRunning={isRunning}
            executionResult={executionResult}
            onClearOutput={handleClearOutput}
            stdinInput={stdinInput}
            onStdinChange={setStdinInput}
            isOutputOpen={isOutputOpen}
            onToggleOutput={() => setIsOutputOpen(!isOutputOpen)}
            isOutputExpanded={isOutputExpanded}
            onToggleOutputExpanded={() => setIsOutputExpanded(!isOutputExpanded)}
            onChangeLanguage={handleChangeLanguage}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4 h-full min-h-[400px]">
          <VulnerabilityList
            vulnerabilities={activeFile.vulnerabilities || []}
            selectedVulnerability={selectedVulnerability}
            onSelectVulnerability={(v) => setSelectedVulnerability(v)}
            onAutoFix={handleAutoFix}
            onSimulateExploit={(v) => setExploitModalVuln(v)}
            onOpenDetail={(v) => setDetailModalVuln(v)}
            isFixing={isFixing}
          />
        </div>
      </main>

      {/* Modals */}
      {detailModalVuln && (
        <VulnerabilityDetailModal
          vulnerability={detailModalVuln}
          onClose={() => setDetailModalVuln(null)}
          onAutoFix={handleAutoFix}
          onSimulateExploit={(v) => setExploitModalVuln(v)}
          isFixing={isFixing}
        />
      )}

      {diffState && (
        <DiffModal
          vulnerability={diffState.vulnerability}
          originalCode={diffState.originalCode}
          remediatedCode={diffState.remediatedCode}
          explanation={diffState.explanation}
          securityImprovements={diffState.securityImprovements}
          onApplyPatch={handleApplyPatch}
          onClose={() => setDiffState(null)}
        />
      )}

      {exploitModalVuln && (
        <ExploitSimulatorModal
          vulnerability={exploitModalVuln}
          file={activeFile}
          onClose={() => setExploitModalVuln(null)}
          onAutoFix={handleAutoFix}
        />
      )}

      <SecurityCopilotChat
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activeFile={activeFile}
        selectedVulnerability={selectedVulnerability}
      />

      <CloudAuditPanel isOpen={isCloudAuditOpen} onClose={() => setIsCloudAuditOpen(false)} files={files} vulnerabilities={activeFile.vulnerabilities || []} />
      <CustomRuleBuilder isOpen={isCustomRulesOpen} onClose={() => setIsCustomRulesOpen(false)} activeFile={activeFile} onApplyRules={(rules) => { setCustomRules(rules); executeLocalScan(activeFile.content, activeFile.language, activeFile.id); }} />
      <AuditReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} activeFile={activeFile} files={files} vulnerabilities={activeFile.vulnerabilities || []} securityScore={securityScore} />
      <SarifModal isOpen={isSarifOpen} onClose={() => setIsSarifOpen(false)} activeFile={activeFile} vulnerabilities={activeFile.vulnerabilities || []} />
      <NewFileModal isOpen={isNewFileOpen} onClose={() => setIsNewFileOpen(false)} onCreateFile={(newFile) => { setFiles((prev) => [...prev, newFile]); setActiveFileId(newFile.id); executeLocalScan(newFile.content, newFile.language, newFile.id); }} />

      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
        currentConfig={{
          provider: (currentAIConfig as any).provider || 'gemini',
          apiKey: (currentAIConfig as any).apiKey || '',
          model: (currentAIConfig as any).model || 'gemini-2.5-flash',
        }}
        onSave={handleSaveAISettings}
      />

      <Dashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        files={files}
        vulnerabilities={activeFile.vulnerabilities || []}
        securityScore={securityScore}
        onScan={handleDeepAIScan}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSarif={() => setIsSarifOpen(true)}
      />

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      <ProjectManager
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        currentFile={{ name: activeFile.name, language: activeFile.language, content: activeFile.content }}
        onLoadProject={handleLoadProject}
      />
    </div>
  );
}
