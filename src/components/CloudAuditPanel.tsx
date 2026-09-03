/**
 * ============================================================================
 * FILE: CloudAuditPanel.tsx
 * TYPE: Cloud Security Checklist / Compliance Component
 * ============================================================================
 * 
 * PURPOSE:
 * Displays a curated checklist of cloud security best practices across
 * different cloud platforms (Docker, Kubernetes, AWS, Azure, GCP).
 * 
 * DESIGN NOTES:
 * - Modal overlay with pass/fail status for each check
 * - Category icons and guidance for failed checks
 * - Compliance percentage calculation
 * 
 * BACKEND INTEGRATION:
 * - NO API CALLS: All checks are local pattern matching
 * - Checks vulnerability array for specific CWE patterns
 * 
 * KEY PROPS:
 * - isOpen, onClose: Modal visibility
 * - files: Files in workspace
 * - vulnerabilities: Current scan results
 * 
 * CLOUD SECURITY CHECKS:
 * 1. Container Least Privilege (CWE-250) - Docker security
 * 2. Kubernetes Pod Security (CWE-269) - K8s best practices
 * 3. Cloud Metadata Protection (CWE-918) - SSRF prevention
 * 4. Secrets Management (CWE-798) - No hardcoded secrets
 * 5. Base Image Pinning (CWE-829) - Supply chain security
 * 
 * STATUS INDICATORS:
 * - PASSED: Green checkmark, no action needed
 * - FAILED: Red warning, guidance provided for fix
 * ============================================================================
 */

import React from 'react';
import { X, Cloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CodeFile, Vulnerability } from '../types';

interface CloudAuditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  files: CodeFile[];
  vulnerabilities: Vulnerability[];
}

export const CloudAuditPanel: React.FC<CloudAuditPanelProps> = ({ isOpen, onClose, files, vulnerabilities }) => {
  if (!isOpen) return null;

  const checks = [
    { title: 'Container Least Privilege (Non-Root)', status: vulnerabilities.some((v) => v.cwe === 'CWE-250') ? 'FAILED' : 'PASSED', category: 'Docker', guidance: 'Enforce USER directive or runAsNonRoot in SecurityContext.' },
    { title: 'Kubernetes Pod Security Standards', status: vulnerabilities.some((v) => v.cwe === 'CWE-269') ? 'FAILED' : 'PASSED', category: 'Kubernetes', guidance: 'Set privileged: false and allowPrivilegeEscalation: false.' },
    { title: 'Cloud Metadata Protection (SSRF)', status: vulnerabilities.some((v) => v.cwe === 'CWE-918') ? 'FAILED' : 'PASSED', category: 'Cloud VPC', guidance: 'Require IMDSv2 with hops=1 and enforce egress allowlists.' },
    { title: 'Secrets Management (No Hardcoding)', status: vulnerabilities.some((v) => v.cwe === 'CWE-798') ? 'FAILED' : 'PASSED', category: 'Secrets', guidance: 'Use Vault, AWS Secrets Manager, or K8s Secrets at runtime.' },
    { title: 'Base Image Pinning & Supply Chain', status: vulnerabilities.some((v) => v.cwe === 'CWE-829') ? 'FAILED' : 'PASSED', category: 'Supply Chain', guidance: 'Pin images with SHA-256 digests and sign with Cosign.' },
  ];

  const passedCount = checks.filter((c) => c.status === 'PASSED').length;
  const compliancePct = Math.round((passedCount / checks.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)' }}>
              <Cloud className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Cloud Security Audit</h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{compliancePct}% compliant • {files.length} files audited</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {checks.map((check, idx) => {
            const passed = check.status === 'PASSED';
            return (
              <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: passed ? '1px solid var(--border)' : '1px solid var(--critical-border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {passed ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--success)' }} /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--critical)' }} />}
                    <div>
                      <div className="text-xs font-medium text-white mb-0.5">{check.title}</div>
                      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{check.category}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ 
                    color: passed ? 'var(--success)' : 'var(--critical)',
                    backgroundColor: passed ? 'var(--success-bg)' : 'var(--critical-bg)',
                  }}>
                    {check.status}
                  </span>
                </div>
                {!passed && (
                  <div className="mt-2 ml-7 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Fix: {check.guidance}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="text-xs font-medium px-3 py-2 rounded-md cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
