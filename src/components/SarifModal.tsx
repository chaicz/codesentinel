import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check
} from 'lucide-react';
import { CodeFile, Vulnerability } from '../types';
import { generateSarifReport } from '../utils/sarifGenerator';

interface SarifModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: CodeFile;
  vulnerabilities: Vulnerability[];
}

export const SarifModal: React.FC<SarifModalProps> = ({
  isOpen,
  onClose,
  activeFile,
  vulnerabilities,
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);
  const sarifData = generateSarifReport(activeFile, vulnerabilities);
  const sarifJsonString = JSON.stringify(sarifData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(sarifJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sarifJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results-${activeFile.name}.sarif`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1115]/90 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#16181D] border-2 border-[#33353F] rounded-none w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0F1115] border-b border-[#33353F] flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-[#E5C07B] text-black font-bold flex items-center justify-center text-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-[#E5C07B]/20 text-[#E5C07B] border border-[#E5C07B]/40 uppercase tracking-wider">
                  OASIS SARIF 2.1.0
                </span>
                <span className="text-[10px] text-[#888EA0] font-mono">
                  GitHub Code Scanning / CI Format
                </span>
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-tight mt-0.5">
                Export Standard Security Analysis Result
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-none text-[#888EA0] hover:text-white hover:bg-[#282C34] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Callout */}
        <div className="px-5 py-3 bg-[#0F1115] border-b border-[#33353F] flex items-center justify-between text-xs text-[#888EA0] font-mono">
          <span>This SARIF report can be directly uploaded to GitHub via <code className="text-[#E5C07B]">github/codeql-action/upload-sarif</code>.</span>
          <span className="text-white">{vulnerabilities.length} findings mapped</span>
        </div>

        {/* JSON Viewer */}
        <div className="p-4 flex-1 overflow-y-auto bg-[#16181D]">
          <pre className="p-3.5 bg-[#0F1115] border border-[#33353F] font-mono text-[11px] text-[#E5C07B] overflow-x-auto max-h-[440px] leading-relaxed">
            {sarifJsonString}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0F1115] border-t border-[#33353F] flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-2 bg-[#1A1D23] hover:bg-[#282C34] text-[#E0E0E0] border border-[#33353F] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-[#4ADE80]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy SARIF JSON'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 bg-[#E5C07B] hover:bg-[#ebd097] text-black transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download .sarif File</span>
          </button>
        </div>
      </div>
    </div>
  );
};

