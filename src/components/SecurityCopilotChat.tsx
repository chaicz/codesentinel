/**
 * ============================================================================
 * FILE: SecurityCopilotChat.tsx
 * TYPE: AI Assistant / Chat Interface Component
 * ============================================================================
 * 
 * PURPOSE:
 * Provides an AI-powered chat assistant for security-related questions,
 * code explanations, remediation guidance, and secure coding best practices.
 * Features enhanced UX with streaming responses, markdown rendering, and
 * context-aware suggestions for building secure functions.
 * 
 * DESIGN NOTES:
 * - Fixed sidebar panel (right side)
 * - Message bubbles with timestamps
 * - Quick action prompts for common tasks
 * - Scrollable message history
 * - Code block highlighting with copy functionality
 * - Streaming responses for faster feedback
 * 
 * BACKEND INTEGRATION:
 * - POST /api/copilot-chat
 *   Body: { messages[], activeFile, selectedVulnerability, stream: boolean }
 *   Returns: { reply: string } or streaming response
 * - Requires AI API key to be configured
 * 
 * KEY FEATURES:
 * - Context-aware quick prompts based on current file
 * - Code snippet highlighting and copying
 * - Vulnerability-targeted assistance
 * - Function building assistance
 * - Secure coding guidance
 * 
 * ERROR HANDLING:
 * - Displays friendly message if AI service unreachable
 * - Shows "Check your API key" guidance
 * - Handles rate limiting gracefully
 * ============================================================================
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CodeFile, Vulnerability, CopilotMessage } from '../types';
import { Bot, Send, Sparkles, X, Copy, Check, ChevronRight, Code2, Shield, Wrench, Zap, Loader2 } from 'lucide-react';

interface SecurityCopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: CodeFile;
  selectedVulnerability: Vulnerability | null;
}

// Simple markdown-like rendering for code blocks
function renderMessage(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textPart = text.slice(lastIndex, match.index);
      parts.push(
        <p key={`text-${lastIndex}`} className="mb-2 whitespace-pre-wrap">
          {textPart}
        </p>
      );
    }

    const language = match[1] || 'code';
    const code = match[2].trim();

    parts.push(
      <div key={`code-${match.index}`} className="my-2 rounded-lg overflow-hidden bg-slate-800/80 border border-slate-700/50">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/50">
          <span className="text-[10px] font-mono text-slate-400">{language}</span>
          <CopyButton code={code} />
        </div>
        <pre className="p-3 overflow-x-auto text-xs font-mono text-slate-200 max-h-[200px]">
          <code>{code}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    // Handle inline code
    const inlineCodeRegex = /`([^`]+)`/g;
    let inlineLastIndex = 0;
    let inlineMatch;
    const inlineParts: React.ReactNode[] = [];

    while ((inlineMatch = inlineCodeRegex.exec(remaining)) !== null) {
      if (inlineMatch.index > inlineLastIndex) {
        inlineParts.push(
          <span key={`inline-text-${inlineLastIndex}`}>
            {remaining.slice(inlineLastIndex, inlineMatch.index)}
          </span>
        );
      }
      inlineParts.push(
        <code key={`inline-code-${inlineMatch.index}`} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-indigo-300 font-mono text-xs">
          {inlineMatch[1]}
        </code>
      );
      inlineLastIndex = inlineMatch.index + inlineMatch[0].length;
    }

    if (inlineLastIndex < remaining.length) {
      inlineParts.push(<span key="inline-final">{remaining.slice(inlineLastIndex)}</span>);
    }

    parts.push(
      <p key={`text-${lastIndex}`} className="mb-2 whitespace-pre-wrap">
        {inlineParts}
      </p>
    );
  }

  return parts;
}

// Copy button component
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
      title="Copy code"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// Quick prompt categories - Enhanced for function building
function getQuickPrompts(activeFile: CodeFile, selectedVulnerability: Vulnerability | null) {
  const language = activeFile.language.toLowerCase();
  
  const basePrompts = [
    { icon: Shield, label: 'Security audit', action: 'Perform a comprehensive security audit of this code. Identify all potential vulnerabilities and suggest fixes.' },
    { icon: Code2, label: 'Fix vulnerability', action: selectedVulnerability ? `Fix the ${selectedVulnerability.title} vulnerability in this code securely.` : 'Fix the security vulnerabilities in this code.' },
    { icon: Wrench, label: 'Build function', action: 'Help me build a secure function. Ask me what type of function I need (API endpoint, database operation, validation, etc.) and I will guide you through creating a secure implementation.' },
    { icon: Zap, label: 'Add auth', action: 'Add authentication and authorization checks to this code.' },
  ];

  const languagePrompts: Record<string, { icon: any; label: string; action: string }[]> = {
    javascript: [
      { icon: Code2, label: 'Secure API', action: 'Write a secure REST API endpoint with input validation, rate limiting, and JWT authentication.' },
      { icon: Shield, label: 'XSS prevention', action: 'Add XSS protection and Content Security Policy headers to this code.' },
      { icon: Wrench, label: 'Build CRUD', action: 'Build a secure CRUD API with input validation, SQL injection prevention, and proper error handling.' },
      { icon: Shield, label: 'JWT auth', action: 'Implement secure JWT authentication with token refresh and proper validation.' },
    ],
    python: [
      { icon: Code2, label: 'Secure Flask', action: 'Create a secure Flask route with proper input validation, SQL injection prevention, and CSRF protection.' },
      { icon: Shield, label: 'SQL injection fix', action: 'Fix SQL injection vulnerabilities using parameterized queries.' },
      { icon: Wrench, label: 'Build API', action: 'Build a secure Python API with authentication, input validation, and rate limiting.' },
      { icon: Shield, label: 'Session security', action: 'Implement secure session management with proper CSRF protection.' },
    ],
    typescript: [
      { icon: Code2, label: 'Type-safe API', action: 'Write a type-safe API handler with input validation and proper error handling.' },
      { icon: Shield, label: 'Secure patterns', action: 'Implement secure coding patterns for this TypeScript code.' },
      { icon: Wrench, label: 'Build middleware', action: 'Build a secure middleware function with authentication and input sanitization.' },
      { icon: Shield, label: 'Input validation', action: 'Add comprehensive input validation and type checking to this code.' },
    ],
    sql: [
      { icon: Wrench, label: 'Build query', action: 'Help me build a secure SQL query. Tell me what data you need to query and I will create a parameterized query.' },
      { icon: Shield, label: 'Fix injection', action: 'Fix SQL injection vulnerabilities in this query using parameterized statements.' },
      { icon: Code2, label: 'Optimize query', action: 'Optimize this SQL query for performance while maintaining security.' },
    ],
    go: [
      { icon: Wrench, label: 'Secure handler', action: 'Build a secure HTTP handler in Go with input validation and proper error handling.' },
      { icon: Shield, label: 'SQL prevention', action: 'Add SQL injection prevention using parameterized queries.' },
    ],
    java: [
      { icon: Wrench, label: 'Secure servlet', action: 'Build a secure Java servlet with input validation and authentication.' },
      { icon: Shield, label: 'SQL prevention', action: 'Fix SQL injection using PreparedStatement.' },
    ],
  };

  // Function building suggestions - shown when user wants to build something new
  const functionBuildingPrompts = [
    { icon: Sparkles, label: '🔧 Build API endpoint', action: 'I need to build an API endpoint. What type (GET, POST, PUT, DELETE)? What data should it handle? I will create a secure implementation with input validation.' },
    { icon: Sparkles, label: '🔐 Build auth function', action: 'Help me build a secure authentication function. What type of auth do you need (login, token validation, session management)? I will implement it with security best practices.' },
    { icon: Sparkles, label: '📝 Build validator', action: 'I need to build an input validation function. What inputs do you need to validate? I will create a comprehensive validator with proper sanitization.' },
    { icon: Sparkles, label: '💾 Build DB operation', action: 'Help me build a database operation function. What operation (CRUD)? What data? I will use parameterized queries to prevent SQL injection.' },
  ];

  return [
    ...basePrompts,
    ...(languagePrompts[language] || []),
    ...functionBuildingPrompts,
    { icon: Sparkles, label: 'OWASP Top 10', action: 'Explain OWASP Top 10 vulnerabilities and how to prevent them in this code.' },
  ];
}

export const SecurityCopilotChat: React.FC<SecurityCopilotChatProps> = ({
  isOpen,
  onClose,
  activeFile,
  selectedVulnerability,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `I'm **CodeSentinel Copilot**. I can help you:

• **Build secure functions** - Tell me what you need and I'll create it with security best practices
• **Fix vulnerabilities** - Fix security issues in your code
• **Understand security concepts** - OWASP Top 10, CWE, secure coding patterns
• **Add authentication & authorization** - JWT, sessions, access control
• **Review code for security issues** - Identify and remediate vulnerabilities

**Ready to build something?** Use the quick prompts below or tell me what you need!

**Example requests:**
- "Build a secure login function"
- "Create an API endpoint for user registration"
- "Build a database query function with SQL injection prevention"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamedContent]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText.trim();
    if (!query || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setStreamedContent('');

    try {
      const res = await fetch('/api/copilot-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMsg], 
          activeFile: { 
            name: activeFile.name, 
            language: activeFile.language, 
            content: activeFile.content 
          }, 
          selectedVulnerability,
          userRequest: query,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        const assistantMsg: CopilotMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: data.reply || 'No response generated.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: CopilotMessage = {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: data.error || '⚠️ AI service error. Please check your API key in Settings.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: CopilotMessage = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: '⚠️ Could not reach the AI service. Please check your API key in Settings and your internet connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStreamedContent('');
    }
  };

  const quickPrompts = getQuickPrompts(activeFile, selectedVulnerability);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-12 right-4 bottom-4 w-full sm:w-[420px] z-40 flex flex-col overflow-hidden rounded-xl shadow-2xl"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)' }}>
            <Bot className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              CodeSentinel Copilot
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/20 text-emerald-400">
                AI
              </span>
            </h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {activeFile.name} • {activeFile.language}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-slate-800"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Context indicator */}
      {selectedVulnerability && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs shrink-0" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <Shield className="w-3 h-3 text-rose-400" />
          <span className="text-rose-300">
            Analyzing: <span className="font-medium">{selectedVulnerability.title}</span>
            <span className="text-rose-400/60 ml-1">({selectedVulnerability.cwe})</span>
          </span>
          <ChevronRight className="w-3 h-3 text-rose-400/50 ml-auto" />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            {/* Sender label */}
            <div className="flex items-center gap-1.5 mb-1">
              {msg.sender === 'assistant' && <Bot className="w-3 h-3" style={{ color: 'var(--accent)' }} />}
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {msg.sender === 'user' ? 'You' : 'Copilot'}
              </span>
            </div>
            
            {/* Message bubble */}
            <div 
              className="max-w-[90%] p-3.5 rounded-xl text-xs leading-relaxed"
              style={{ 
                backgroundColor: msg.sender === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
              }}
            >
              {renderMessage(msg.text)}
            </div>
            <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>{msg.timestamp}</span>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'var(--accent-dim)' }}>
              <Bot className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex flex-col gap-1.5 text-xs p-3.5 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Processing your request...</span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                Building secure code patterns...
              </span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2.5 flex flex-col gap-2 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {/* Build section */}
        <div className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>BUILD</span>
          <div className="flex items-center gap-1 overflow-x-auto">
            {quickPrompts.filter(p => p.label.includes('Build') || p.label.includes('Secure') || p.label.includes('JWT')).slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt.action)}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all disabled:opacity-50 hover:opacity-80"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                <prompt.icon className="w-3 h-3" />
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Security section */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>SECURITY</span>
          <div className="flex items-center gap-1 overflow-x-auto">
            {quickPrompts.filter(p => !p.label.includes('Build') && !p.label.includes('Secure') && !p.label.includes('JWT') && !p.label.includes('🔧') && !p.label.includes('🔐') && !p.label.includes('📝') && !p.label.includes('💾')).slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt.action)}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                <prompt.icon className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask to build, fix, or review code..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3 py-2.5 rounded-lg text-xs transition-all"
            style={{ 
              backgroundColor: 'var(--bg-elevated)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-primary)', 
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[9px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
          Press Enter to send • Use quick prompts for common tasks
        </p>
      </div>
    </div>
  );
};
