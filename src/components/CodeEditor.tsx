import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Vulnerability, CodeFile, ExecutionResult } from '../types';
import { OutputPanel } from './OutputPanel';
import { 
  Sparkles, 
  Terminal, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  RotateCcw,
  Play,
  Check,
  X,
} from 'lucide-react';

interface CodeEditorProps {
  file: CodeFile;
  onChange: (value: string) => void;
  vulnerabilities: Vulnerability[];
  selectedVulnerability: Vulnerability | null;
  onSelectVulnerability: (vuln: Vulnerability) => void;
  onAutoFix: (vuln: Vulnerability) => void;
  onSimulateExploit: (vuln: Vulnerability) => void;
  onResetToDefault: () => void;
  isFixing: boolean;
  onRunCode: () => void;
  isRunning: boolean;
  executionResult: ExecutionResult | null;
  onClearOutput: () => void;
  stdinInput: string;
  onStdinChange: (val: string) => void;
  isOutputOpen: boolean;
  onToggleOutput: () => void;
  isOutputExpanded: boolean;
  onToggleOutputExpanded: () => void;
  onChangeLanguage?: (lang: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  file,
  onChange,
  vulnerabilities,
  selectedVulnerability,
  onAutoFix,
  onSimulateExploit,
  onResetToDefault,
  isFixing,
  onRunCode,
  isRunning,
  executionResult,
  onClearOutput,
  stdinInput,
  onStdinChange,
  isOutputOpen,
  onToggleOutput,
  isOutputExpanded,
  onToggleOutputExpanded,
  onChangeLanguage,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [copied, setCopied] = React.useState(false);
  const onRunCodeRef = useRef(onRunCode);

  useEffect(() => {
    onRunCodeRef.current = onRunCode;
  }, [onRunCode]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunCodeRef.current();
    });
    updateDecorations(editor, monaco, vulnerabilities);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', glyph: '#EF4444' };
      case 'HIGH': return { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', glyph: '#F97316' };
      case 'MEDIUM': return { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.3)', glyph: '#EAB308' };
      default: return { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', glyph: '#6B7280' };
    }
  };

  const updateDecorations = (editor: any, monaco: any, vulns: Vulnerability[]) => {
    if (!editor || !monaco) return;
    const newDecorations = vulns.map((v) => {
      const isSelected = selectedVulnerability?.id === v.id;
      const colors = getSeverityColor(v.severity);
      let lineClassName = '';
      if (isSelected) {
        lineClassName = `bg-[rgba(20,184,166,0.08)] border-l-2`;
      }
      return {
        range: new monaco.Range(v.lineStart, 1, v.lineEnd || v.lineStart, 1),
        options: {
          isWholeLine: true,
          className: lineClassName,
          glyphMarginClassName: '',
          glyphMarginHoverMessage: { value: `**[${v.severity}] ${v.title}** (${v.cwe})\n\n${v.description}` },
        },
      };
    });
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      updateDecorations(editorRef.current, monacoRef.current, vulnerabilities);
    }
  }, [vulnerabilities, selectedVulnerability]);

  useEffect(() => {
    if (selectedVulnerability && editorRef.current) {
      editorRef.current.revealLineInCenter(selectedVulnerability.lineStart);
      editorRef.current.setPosition({ lineNumber: selectedVulnerability.lineStart, column: 1 });
    }
  }, [selectedVulnerability]);

  const getLanguageMode = (lang: string) => {
    const l = (lang || '').toLowerCase();
    const map: Record<string, string> = {
      python: 'python', py: 'python',
      javascript: 'javascript', js: 'javascript',
      typescript: 'typescript', ts: 'typescript',
      c: 'c', cpp: 'cpp', 'c++': 'cpp', h: 'cpp',
      go: 'go', golang: 'go',
      java: 'java',
      csharp: 'csharp', cs: 'csharp',
      php: 'php',
      ruby: 'ruby', rb: 'ruby',
      rust: 'rust', rs: 'rust',
      sql: 'sql',
      dockerfile: 'dockerfile', docker: 'dockerfile',
      yaml: 'yaml', yml: 'yaml',
      json: 'json',
      html: 'html', htm: 'html',
      bash: 'shell', sh: 'shell', shell: 'shell',
    };
    return map[l] || 'plaintext';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const criticalCount = vulnerabilities.filter((v) => v.severity === 'CRITICAL').length;
  const highCount = vulnerabilities.filter((v) => v.severity === 'HIGH').length;

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      {/* Tab Bar */}
      <div className="h-10 px-3 flex items-center justify-between gap-2 shrink-0" style={{ backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="text-xs font-medium text-white">{file.name}</span>
            {onChangeLanguage && (
              <select
                aria-label="Language"
                value={file.language}
                onChange={(e) => onChangeLanguage(e.target.value)}
                className="bg-transparent text-[11px] text-[var(--accent)] border-none focus:outline-none cursor-pointer"
              >
                {['python','javascript','typescript','c','go','java','csharp','php','ruby','rust','sql','bash','dockerfile','yaml','json','html'].map(lang => (
                  <option key={lang} value={lang} style={{ backgroundColor: 'var(--bg-surface)' }}>{lang}</option>
                ))}
              </select>
            )}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {file.content.split('\n').length} lines
          </span>
        </div>

        <div className="flex items-center gap-1">
          {vulnerabilities.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-md font-medium" style={{ 
              backgroundColor: criticalCount > 0 ? 'var(--critical-bg)' : highCount > 0 ? 'var(--high-bg)' : 'var(--low-bg)',
              color: criticalCount > 0 ? 'var(--critical)' : highCount > 0 ? 'var(--high)' : 'var(--low)',
              border: `1px solid ${criticalCount > 0 ? 'var(--critical-border)' : highCount > 0 ? 'var(--high-border)' : 'var(--low-border)'}`,
            }}>
              {vulnerabilities.length} finding{vulnerabilities.length !== 1 ? 's' : ''}
            </span>
          )}

          <button
            onClick={copyToClipboard}
            className="p-1.5 rounded-md cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            title="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onResetToDefault}
            className="p-1.5 rounded-md cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative min-h-[300px]" style={{ backgroundColor: '#0D0D0F' }}>
        <Editor
          height="100%"
          language={getLanguageMode(file.language)}
          value={file.content}
          theme="vs-dark"
          onChange={(val) => onChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            glyphMargin: false,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            renderLineHighlight: 'line',
            padding: { top: 16, bottom: 16 },
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { vertical: 'auto', horizontal: 'auto', verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
          }}
        />

        {/* Selected Vulnerability Action Bar */}
        {selectedVulnerability && (
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg animate-fade-in z-10"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              border: '1px solid var(--border-active)',
              backdropFilter: 'blur(8px)',
            }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded"
                style={{
                  backgroundColor: selectedVulnerability.severity === 'CRITICAL' ? 'var(--critical-bg)' : 'var(--high-bg)',
                  color: selectedVulnerability.severity === 'CRITICAL' ? 'var(--critical)' : 'var(--high)',
                  border: `1px solid ${selectedVulnerability.severity === 'CRITICAL' ? 'var(--critical-border)' : 'var(--high-border)'}`,
                }}>
                {selectedVulnerability.severity}
              </span>
              <span className="text-xs font-medium text-white truncate">{selectedVulnerability.title}</span>
              <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                {selectedVulnerability.cwe}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSimulateExploit(selectedVulnerability)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md cursor-pointer"
                style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-hover)' }}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Simulate</span>
              </button>

              <button
                id="btn-quick-fix-ai"
                onClick={() => onAutoFix(selectedVulnerability)}
                disabled={isFixing}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                {isFixing ? (
                  <>
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    <span>Fixing</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fix</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Output */}
      {isOutputOpen && (
        <OutputPanel
          isRunning={isRunning}
          onRunCode={onRunCode}
          result={executionResult}
          onClear={onClearOutput}
          stdinInput={stdinInput}
          onStdinChange={onStdinChange}
          isExpanded={isOutputExpanded}
          onToggleExpand={onToggleOutputExpanded}
          activeLanguage={file.language}
        />
      )}

      {/* Status Bar */}
      <div className="h-7 px-3 flex items-center justify-between text-[11px]" style={{ backgroundColor: 'var(--bg-base)', borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <button
          id="btn-toggle-output-panel"
          onClick={onToggleOutput}
          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer"
          style={{ 
            color: isOutputOpen ? 'var(--accent)' : 'var(--text-muted)',
            backgroundColor: isOutputOpen ? 'var(--accent-dim)' : 'transparent',
          }}
        >
          <Terminal className="w-3 h-3" />
          <span>Terminal</span>
          {executionResult && (
            <span className={`font-mono ${executionResult.exitCode === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {executionResult.exitCode}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline">
            <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>Ctrl+Enter</kbd>
            <span className="ml-1.5">to run</span>
          </span>
          <span>Ln {selectedVulnerability?.lineStart || 1}</span>
        </div>
      </div>
    </div>
  );
};
