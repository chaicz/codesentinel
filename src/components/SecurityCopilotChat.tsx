/**
 * ============================================================================
 * FILE: SecurityCopilotChat.tsx
 * TYPE: AI Assistant / Chat Interface Component
 * ============================================================================
 * 
 * PURPOSE:
 * Provides an AI-powered chat assistant for security-related questions,
 * code explanations, remediation guidance, and secure coding best practices.
 * 
 * DESIGN NOTES:
 * - Fixed sidebar panel (right side)
 * - Message bubbles with timestamps
 * - Quick action prompts for common tasks
 * - Scrollable message history
 * 
 * BACKEND INTEGRATION:
 * - POST /api/copilot-chat
 *   Body: { messages[], activeFile, selectedVulnerability }
 *   Returns: { reply: string }
 * - Requires AI API key to be configured
 * 
 * KEY PROPS:
 * - isOpen, onClose: Panel visibility
 * - activeFile: Current file context for AI
 * - selectedVulnerability: Specific vulnerability for targeted help
 * 
 * QUICK PROMPTS INCLUDED:
 * - "Fix [vulnerability] securely?"
 * - "Write security unit tests"
 * - "Zero Trust implementation"
 * - "SSRF prevention"
 * 
 * MESSAGE STRUCTURE:
 * - CopilotMessage: { id, sender: 'user'|'assistant', text, timestamp }
 * - Conversation history sent with each request for context
 * 
 * ERROR HANDLING:
 * - Displays friendly message if AI service unreachable
 * - Shows "Check your API key" guidance
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import { CodeFile, Vulnerability, CopilotMessage } from '../types';
import { Bot, Send, Sparkles, X } from 'lucide-react';

interface SecurityCopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: CodeFile;
  selectedVulnerability: Vulnerability | null;
}

export const SecurityCopilotChat: React.FC<SecurityCopilotChatProps> = ({
  isOpen,
  onClose,
  activeFile,
  selectedVulnerability,
}) => {
  if (!isOpen) return null;

  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `I'm CodeSentinel Copilot. Ask me about securing \`${activeFile.name}\`, fixing vulnerabilities, OWASP Top 10, CWE, or secure architecture patterns.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

    try {
      const res = await fetch('/api/copilot-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], activeFile, selectedVulnerability }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: CopilotMessage = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: data.reply || 'No response generated.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Could not reach the AI service. Please check your API key in Settings.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    `Fix ${selectedVulnerability?.title || 'this'} securely?`,
    'Write security unit tests',
    'Zero Trust implementation',
    'SSRF prevention',
  ];

  return (
    <div 
      className="fixed top-12 right-4 bottom-4 w-full sm:w-[380px] z-40 flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--accent-dim)' }}>
            <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Copilot</h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{activeFile.name}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-md cursor-pointer" style={{ color: 'var(--text-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className="max-w-[85%] p-3 rounded-lg text-xs leading-relaxed"
              style={{ 
                backgroundColor: msg.sender === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                color: msg.sender === 'user' ? 'white' : 'var(--text-secondary)',
              }}
            >
              {msg.text}
            </div>
            <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>{msg.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            <span>Analyzing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            <Sparkles className="w-3 h-3 inline mr-1" style={{ color: 'var(--accent)' }} />
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about security..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md text-xs"
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
            className="p-2 rounded-md cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
