import React, { useState } from 'react';
import { 
  Zap, 
  Shield, 
  Code2, 
  Bot, 
  Play, 
  Sparkles, 
  Lock, 
  Terminal,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  FileCode,
  Bug,
  TrendingUp,
  Globe,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      icon: Shield,
      title: 'AI Security Analysis',
      desc: 'Deep semantic scanning powered by Gemini, GPT-4, or Claude. Detects zero-day vulnerabilities beyond pattern matching.',
    },
    {
      icon: Play,
      title: 'Code Sandbox Runner',
      desc: 'Execute 16+ languages instantly in an isolated sandbox. Python, JavaScript, Go, Rust, C, SQL, and more.',
    },
    {
      icon: Bot,
      title: 'AI Auto-Remediation',
      desc: 'One-click fix generation. AI suggests production-ready patches with full explanations.',
    },
    {
      icon: Bug,
      title: 'Exploit Simulation',
      desc: 'See how vulnerabilities are exploited in a safe sandbox environment. Understand the attack vector.',
    },
    {
      icon: TrendingUp,
      title: 'Security Score',
      desc: 'Real-time security posture scoring. Track improvements as you fix vulnerabilities.',
    },
    {
      icon: Globe,
      title: 'SARIF Export',
      desc: 'Export findings in SARIF 2.1.0 format for GitHub Advanced Security, Azure DevOps, and any CI/CD pipeline.',
    },
  ];

  const languages = ['Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C', 'C++', 'Java', 'C#', 'PHP', 'Ruby', 'SQL', 'Bash', 'Dockerfile', 'YAML', 'HTML'];

  const demoCode = `def transfer_funds(user_id, amount, recipient):
    query = f"SELECT * FROM users WHERE id={user_id}"
    cursor.execute(query)
    
    query = f"UPDATE accounts SET balance = balance - {amount} WHERE user_id = {user_id}"
    cursor.execute(query)
    
    query = f"UPDATE accounts SET balance = balance + {amount} WHERE id = {recipient}"
    cursor.execute(query)
    
    conn.commit()`;

  const demoFindings = [
    { severity: 'CRITICAL', cwe: 'CWE-89', title: 'SQL Injection', line: 3 },
    { severity: 'HIGH', cwe: 'CWE-918', title: 'SSRF via string formatting', line: 1 },
    { severity: 'HIGH', cwe: 'CWE-798', title: 'Hardcoded secrets in string literals', line: 1 },
  ];

  return (
    <div className="min-h-screen overflow-auto" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="text-sm font-semibold">Sentinel</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}>IDE</span>
        </div>
        <button
          onClick={onGetStarted}
          className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-md cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: 'white' }}
        >
          <span>Get Started</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-6" style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <Sparkles className="w-3 h-3" style={{ color: 'var(--accent)' }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>AI-Powered Code Security</span>
        </div>

        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight">
          Secure code at the<br />
          <span style={{ color: 'var(--accent)' }}>speed of thought.</span>
        </h1>

        <p className="text-base max-w-xl mx-auto mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Write, run, and secure code — all in one place. AI-powered vulnerability detection, automatic remediation, and a code sandbox for 16+ languages.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            <span>Start for free</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No credit card required</span>
        </div>

        {/* Supported languages */}
        <div className="mt-10">
          <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>Supports 16+ languages</p>
          <div className="flex flex-wrap justify-center gap-2">
            {languages.map(lang => (
              <span key={lang} className="text-[11px] px-2.5 py-1 rounded-md font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Code Demo */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {/* Tab bar */}
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <FileCode className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-medium">payment.py</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
            </div>
          </div>

          {/* Code */}
          <div className="p-4 font-mono text-xs leading-relaxed" style={{ color: '#ABB2BF' }}>
            <pre className="whitespace-pre">{demoCode}</pre>
          </div>

          {/* Findings bar */}
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span className="text-[11px]" style={{ color: 'var(--accent)' }}>3 AI findings</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>•</span>
            <span className="text-[11px] font-semibold" style={{ color: '#EF4444' }}>1 Critical</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>•</span>
            <span className="text-[11px] font-semibold" style={{ color: '#F97316' }}>2 High</span>
            <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>Security Score: <strong className="text-red-400">25%</strong></span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-2">Everything you need to ship secure code</h2>
        <p className="text-sm text-center mb-10" style={{ color: 'var(--text-muted)' }}>From scan to fix, powered by AI</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="p-5 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--accent-dim)' }}>
                <f.icon className="w-4.5 h-4.5" style={{ color: 'var(--accent)' }} />
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <div className="p-8 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl font-bold mb-2">Ready to secure your code?</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Get started in seconds. No setup required.</p>
          <button
            onClick={onGetStarted}
            className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg mx-auto cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            <span>Launch Sentinel IDE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <p className="text-[11px]">
          Sentinel IDE — AI-Powered Code Security Platform
        </p>
      </footer>
    </div>
  );
};
