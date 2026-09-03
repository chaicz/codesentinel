/**
 * ============================================================================
 * FILE: NewFileModal.tsx
 * TYPE: File Creation / Import Component
 * ============================================================================
 * 
 * PURPOSE:
 * Provides a UI for creating new source files or importing existing ones
 * from the local filesystem. Supports 15+ programming languages.
 * 
 * DESIGN NOTES:
 * - Modal with language template buttons
 * - File upload via drag-and-drop or file picker
 * - Language auto-detection from file extension
 * - Starter code templates per language
 * 
 * BACKEND INTEGRATION:
 * - NO API CALLS: File creation handled locally
 * - Uses LANGUAGE_STARTERS from ../data/presetFiles
 * 
 * KEY PROPS:
 * - isOpen, onClose: Modal visibility
 * - onCreateFile: Callback with new CodeFile object
 * 
 * SUPPORTED LANGUAGES:
 * Python, JavaScript, TypeScript, C, C++, Go, Java, C#, PHP,
 * Ruby, Rust, SQL, Bash/Shell, Dockerfile, YAML, JSON, HTML
 * 
 * FILE UPLOAD:
 * - Detects language from extension
 * - Reads file content via FileReader API
 * - Auto-populates filename and language
 * 
 * STARTER CODE:
 * - Each language has boilerplate code template
 * - Examples: Python function main(), JavaScript console.log,
 *   Java class Main, C++ hello world, etc.
 * 
 * CODEFILE STRUCTURE:
 * - id: Unique identifier
 * - name: Filename with extension
 * - language: Programming language
 * - category: File category (default: 'General')
 * - description: File description
 * - content: Source code content
 * - vulnerabilities: Array (empty for new files)
 * ============================================================================
 */

import React, { useState } from 'react';
import { X, Plus, FileCode, Upload, Code2 } from 'lucide-react';
import { CodeFile } from '../types';
import { LANGUAGE_STARTERS } from '../data/presetFiles';

interface NewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (file: CodeFile) => void;
}

export const NewFileModal: React.FC<NewFileModalProps> = ({
  isOpen,
  onClose,
  onCreateFile,
}) => {
  if (!isOpen) return null;

  const [fileName, setFileName] = useState('');
  const [language, setLanguage] = useState<string>('python');
  const [category, setCategory] = useState<string>('General');
  const [description, setDescription] = useState('');
  const [initialCode, setInitialCode] = useState('');

  const handleSelectLanguage = (lang: string) => {
    setLanguage(lang);
    const starter = LANGUAGE_STARTERS[lang];
    if (starter) {
      if (!fileName || Object.values(LANGUAGE_STARTERS).some((s) => s.name === fileName)) {
        setFileName(starter.name);
      }
      if (!initialCode.trim()) {
        setInitialCode(starter.content);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    // Detect language
    const name = file.name.toLowerCase();
    if (name.endsWith('.py')) setLanguage('python');
    else if (name.endsWith('.js') || name.endsWith('.jsx')) setLanguage('javascript');
    else if (name.endsWith('.ts') || name.endsWith('.tsx')) setLanguage('typescript');
    else if (name.endsWith('.c') || name.endsWith('.h')) setLanguage('c');
    else if (name.endsWith('.cpp') || name.endsWith('.cc')) setLanguage('cpp');
    else if (name.endsWith('.go')) setLanguage('go');
    else if (name.endsWith('.java')) setLanguage('java');
    else if (name.endsWith('.cs')) setLanguage('csharp');
    else if (name.endsWith('.php')) setLanguage('php');
    else if (name.endsWith('.rb')) setLanguage('ruby');
    else if (name.endsWith('.rs')) setLanguage('rust');
    else if (name.endsWith('.sql')) setLanguage('sql');
    else if (name.endsWith('.sh') || name.endsWith('.bash')) setLanguage('bash');
    else if (name.includes('dockerfile')) setLanguage('dockerfile');
    else if (name.endsWith('.yaml') || name.endsWith('.yml')) setLanguage('yaml');
    else if (name.endsWith('.json')) setLanguage('json');
    else if (name.endsWith('.html') || name.endsWith('.htm')) setLanguage('html');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setInitialCode(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    const newFile: CodeFile = {
      id: `file-${Date.now()}`,
      name: fileName.trim(),
      language,
      category,
      description: description || 'Source code file',
      content: initialCode.trim() || `// ${fileName}\n`,
      vulnerabilities: [],
    };

    onCreateFile(newFile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Create or Import Source File</h2>
              <p className="text-xs text-slate-400">Add any programming language to scan and execute</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs bg-slate-900">
          {/* Quick Language Badges */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">
              Choose Language Template:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'python', label: 'Python' },
                { id: 'javascript', label: 'JavaScript' },
                { id: 'typescript', label: 'TypeScript' },
                { id: 'c', label: 'C / C++' },
                { id: 'go', label: 'Go' },
                { id: 'java', label: 'Java' },
                { id: 'csharp', label: 'C#' },
                { id: 'php', label: 'PHP' },
                { id: 'ruby', label: 'Ruby' },
                { id: 'rust', label: 'Rust' },
                { id: 'sql', label: 'SQL' },
                { id: 'bash', label: 'Bash' },
                { id: 'dockerfile', label: 'Docker' },
                { id: 'yaml', label: 'YAML' },
                { id: 'json', label: 'JSON' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleSelectLanguage(lang.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    language === lang.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                File Name with Extension *
              </label>
              <input
                type="text"
                placeholder="e.g. app.py, script.js, Main.java"
                value={fileName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFileName(val);
                  if (val.endsWith('.py')) setLanguage('python');
                  else if (val.endsWith('.js')) setLanguage('javascript');
                  else if (val.endsWith('.ts')) setLanguage('typescript');
                  else if (val.endsWith('.c') || val.endsWith('.h')) setLanguage('c');
                  else if (val.endsWith('.cpp')) setLanguage('cpp');
                  else if (val.endsWith('.go')) setLanguage('go');
                  else if (val.endsWith('.java')) setLanguage('java');
                  else if (val.endsWith('.cs')) setLanguage('csharp');
                  else if (val.endsWith('.php')) setLanguage('php');
                  else if (val.endsWith('.rb')) setLanguage('ruby');
                  else if (val.endsWith('.rs')) setLanguage('rust');
                  else if (val.endsWith('.sql')) setLanguage('sql');
                  else if (val.endsWith('.sh')) setLanguage('bash');
                  else if (val.toLowerCase().includes('docker')) setLanguage('dockerfile');
                  else if (val.endsWith('.yaml') || val.endsWith('.yml')) setLanguage('yaml');
                  else if (val.endsWith('.json')) setLanguage('json');
                }}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Language Mode
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="typescript">TypeScript</option>
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="go">Go</option>
                <option value="java">Java</option>
                <option value="csharp">C# (.NET)</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="rust">Rust</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash / Shell</option>
                <option value="dockerfile">Dockerfile</option>
                <option value="yaml">YAML</option>
                <option value="json">JSON</option>
                <option value="html">HTML</option>
              </select>
            </div>
          </div>

          {/* Upload File shortcut */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload local source file:</span>
            </div>
            <label className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition-colors">
              Choose File
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">
              Source Code Content
            </label>
            <textarea
              rows={6}
              placeholder="Paste or write your source code here..."
              value={initialCode}
              onChange={(e) => setInitialCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-indigo-600/20"
            >
              Add File to Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
