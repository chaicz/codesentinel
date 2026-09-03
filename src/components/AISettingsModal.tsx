/**
 * ============================================================================
 * FILE: AISettingsModal.tsx
 * TYPE: AI Configuration / Settings Component
 * ============================================================================
 * 
 * PURPOSE:
 * Allows users to configure their preferred AI provider (Gemini, OpenAI,
 * or Anthropic) and enter their API key for AI-powered features.
 * 
 * DESIGN NOTES:
 * - Modal with provider selection grid
 * - API key input with show/hide toggle
 * - Model dropdown per provider
 * - Current configuration summary
 * - Success/error status messages
 * 
 * BACKEND INTEGRATION:
 * - POST /api/auth/ai-settings
 *   Body: { provider, apiKey, model }
 *   Saves AI configuration to user account
 * 
 * KEY PROPS:
 * - isOpen, onClose: Modal visibility
 * - currentConfig: Current { provider, apiKey, model }
 * - onSave: Callback with new configuration
 * 
 * SUPPORTED AI PROVIDERS:
 * - Google Gemini (default)
 * - OpenAI (GPT-4, GPT-4o, etc.)
 * - Anthropic (Claude 3.5 Sonnet, etc.)
 * 
 * API KEY SOURCES:
 * - Gemini: console.cloud.google.com → APIs & Services → Credentials
 * - OpenAI: platform.openai.com → API Keys
 * - Anthropic: console.anthropic.com → API Keys
 * 
 * VALIDATION:
 * - API key required to save
 * - Validates against backend before saving
 * - Shows success message on save
 * - Redirects to settings if API fails
 * ============================================================================
 */

import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Settings2, Key, ChevronDown } from 'lucide-react';
import { AI_PROVIDERS, AIProvider, AIModelOption } from '../types';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: {
    provider: AIProvider;
    apiKey: string;
    model: string;
  };
  onSave: (config: { provider: AIProvider; apiKey: string; model: string }) => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(currentConfig.provider || 'gemini');
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [selectedModel, setSelectedModel] = useState(currentConfig.model || AI_PROVIDERS[0].defaultModel);
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const provider = AI_PROVIDERS.find((p) => p.id === selectedProvider)!;

  const handleProviderChange = (newProvider: AIProvider) => {
    const prov = AI_PROVIDERS.find((p) => p.id === newProvider)!;
    setSelectedProvider(newProvider);
    setSelectedModel(prov.defaultModel);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key is required to use AI features.');
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/ai-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, apiKey: apiKey.trim(), model: selectedModel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to save AI settings.');
        return;
      }
      onSave({ provider: selectedProvider, apiKey: apiKey.trim(), model: selectedModel });
      setSuccess(`${provider.label} configured successfully.`);
      setTimeout(onClose, 1200);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <Settings2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">AI Settings</h2>
              <p className="text-xs text-slate-400">Choose your AI provider and model</p>
            </div>
          </div>
          <button
            id="ai-settings-close"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Selection */}
        <div className="px-6 pt-5 pb-3">
          <label className="block text-xs font-medium text-slate-400 mb-2.5">
            AI Provider
          </label>
          <div className="grid grid-cols-3 gap-2">
            {AI_PROVIDERS.map((p) => (
              <button
                key={p.id}
                id={`ai-provider-${p.id}`}
                onClick={() => handleProviderChange(p.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedProvider === p.id
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <span className="text-lg">{p.icon}</span>
                <span className="text-xs font-semibold leading-tight">{p.label}</span>
                <span className="text-[10px] opacity-70 leading-tight">{p.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="px-6 pt-2 pb-3">
          <label className="block text-xs font-medium text-slate-400 mb-2" htmlFor="ai-api-key">
            <span className="flex items-center gap-1.5">
              <Key className="w-3 h-3" />
              API Key for {provider.label}
            </span>
          </label>
          <div className="relative">
            <input
              id="ai-api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setError(''); setSuccess(''); }}
              placeholder={provider.id === 'gemini' ? 'AIza...' : provider.id === 'openai' ? 'sk-...' : 'sk-ant-...'}
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 pr-16"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {provider.id === 'gemini' && 'Get your key at console.cloud.google.com → APIs & Services → Credentials'}
            {provider.id === 'openai' && 'Get your key at platform.openai.com → API Keys'}
            {provider.id === 'anthropic' && 'Get your key at console.anthropic.com → API Keys'}
          </p>
        </div>

        {/* Model Selection */}
        <div className="px-6 pt-2 pb-3">
          <label className="block text-xs font-medium text-slate-400 mb-2" htmlFor="ai-model">
            Model
          </label>
          <div className="relative">
            <select
              id="ai-model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full appearance-none rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 pr-10 cursor-pointer"
            >
              {provider.models.map((m: AIModelOption) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Per-provider info */}
        <div className="px-6 pb-4">
          <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3.5">
            <p className="text-xs font-semibold text-slate-300 mb-1.5">Current configuration:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-[11px] text-slate-500">Provider</span>
              <span className="text-[11px] text-slate-200">{provider.icon} {provider.label}</span>
              <span className="text-[11px] text-slate-500">Model</span>
              <span className="text-[11px] text-slate-200">{selectedModel}</span>
              <span className="text-[11px] text-slate-500">API Key</span>
              <span className="text-[11px] text-slate-200">{apiKey ? (apiKey.slice(0, 4) + '••••••••' + apiKey.slice(-3)) : '— not set —'}</span>
            </div>
          </div>
        </div>

        {/* Status messages */}
        {(error || success) && (
          <div className="px-6 pb-3">
            {error && (
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="ai-settings-save"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/25 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
