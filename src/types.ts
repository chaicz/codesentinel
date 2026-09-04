/**
 * ============================================================================
 * FILE: types.ts
 * TYPE: TypeScript Type Definitions
 * ============================================================================
 * 
 * PURPOSE:
 * Central location for all TypeScript type definitions used throughout
 * the CodeSentinel application.
 * 
 * KEY TYPES:
 * - AIProvider: Supported AI providers (gemini, openai, anthropic)
 * - AIProviderConfig: AI configuration with provider, apiKey, model
 * - AI_PROVIDERS: Array of available AI providers with model options
 * - Severity: Vulnerability severity levels (CRITICAL, HIGH, MEDIUM, LOW, INFO)
 * - OWASPCategory: OWASP Top 10 2021 categories
 * - CodeFile: Represents a code file with content and vulnerabilities
 * - Vulnerability: Security vulnerability with all metadata
 * - CustomRule: User-defined security pattern
 * - ExecutionResult: Code execution output
 * - AuthUser: Authenticated user object
 * 
 * AI PROVIDERS:
 * - Google Gemini (gemini) - Default provider
 * - OpenAI GPT-4 (openai)
 * - Anthropic Claude (anthropic)
 * 
 * SEVERITY LEVELS:
 * - CRITICAL: Immediate action required (CVSS 9.0-10.0)
 * - HIGH: High priority fix (CVSS 7.0-8.9)
 * - MEDIUM: Should be addressed (CVSS 4.0-6.9)
 * - LOW: Minor issues (CVSS 0.1-3.9)
 * - INFO: Informational only
 * ============================================================================
 */

// AI Provider Types
export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIModelOption {
  id: string;
  label: string;
  description: string;
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export const AI_PROVIDERS: {
  id: AIProvider;
  label: string;
  icon: string;
  description: string;
  models: AIModelOption[];
  defaultModel: string;
}[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    icon: '✨',
    description: 'Fast, multimodal AI from Google',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Latest fast & powerful model' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Fast & affordable, great for code analysis' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Most capable, best for complex reasoning' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Balanced speed and quality' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Large context window (1M tokens)' },
    ],
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    icon: '🤖',
    description: 'GPT-4o and o-series models',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', description: 'Fast, capable multimodal model' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Lightweight and cost-effective' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Powerful reasoning and code skills' },
      { id: 'o1-preview', label: 'o1 Preview', description: 'Advanced reasoning model' },
      { id: 'o1-mini', label: 'o1 Mini', description: 'Fast reasoning model for code' },
    ],
    defaultModel: 'gpt-4o',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    icon: '🧠',
    description: 'Claude 3.5 Sonnet — best for deep analysis',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude 3.5 Sonnet', description: 'Excellent code reasoning and security analysis' },
      { id: 'claude-opus-4-20250514', label: 'Claude 3.5 Opus', description: 'Highest capability for complex tasks' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', description: 'Fast and affordable' },
    ],
    defaultModel: 'claude-sonnet-4-20250514',
  },
];

export const DEFAULT_AI_CONFIG: AIProviderConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.0-flash',
};

// Severity Type
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

// OWASP Category Type
export type OWASPCategory = 
  | 'A01:2021-Broken Access Control'
  | 'A02:2021-Cryptographic Failures'
  | 'A03:2021-Injection'
  | 'A04:2021-Insecure Design'
  | 'A05:2021-Security Misconfiguration'
  | 'A06:2021-Vulnerable and Outdated Components'
  | 'A07:2021-Identification and Authentication Failures'
  | 'A08:2021-Software and Data Integrity Failures'
  | 'A09:2021-Security Logging and Monitoring Failures'
  | 'A10:2021-Server-Side Request Forgery (SSRF)'
  | 'Cloud-Native & Container Security'
  | 'Memory & Resource Safety';

// Code File Interface
export interface CodeFile {
  id: string;
  name: string;
  language: string;
  category?: string;
  description?: string;
  content: string;
  vulnerabilities: Vulnerability[];
  isScanned?: boolean;
  lastScannedAt?: string;
}

// Vulnerability Interface
export interface Vulnerability {
  id: string;
  title: string;
  severity: Severity;
  owaspCategory: OWASPCategory;
  cwe: string;
  cvssScore: number;
  lineStart: number;
  lineEnd: number;
  vulnerableSnippet: string;
  description: string;
  impact: string;
  exploitScenario: string;
  remediation: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: 'STATIC_ANALYZER' | 'AI_SCAN' | 'CUSTOM_RULE';
  taintTrace?: {
    source: string;
    sink: string;
    flowDescription: string;
  };
}

// Custom Rule Interface
export interface CustomRule {
  id: string;
  name: string;
  pattern: string;
  severity: Severity;
  owaspCategory: OWASPCategory;
  cwe: string;
  message: string;
  remediationTip: string;
  language: string;
  enabled: boolean;
}

// Execution Result Interface
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  runtimeType: 'NATIVE_EXECUTION' | 'SANDBOXED' | 'CONTAINER';
  engine: string;
  timestamp: string;
}

// Auth User Interface
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
  aiConfig?: AIProviderConfig;
  createdAt?: string;
}

// Project/Folder Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  language: string;
  content: string;
}
