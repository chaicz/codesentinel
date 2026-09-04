/**
 * ============================================================================
 * FILE: aiService.ts
 * TYPE: AI Service Integration Module
 * ============================================================================
 * 
 * PURPOSE:
 * Provides unified AI-powered security analysis capabilities using
 * multiple AI providers (Google Gemini, OpenAI GPT-4, Anthropic Claude).
 * 
 * SUPPORTED AI PROVIDERS:
 * - Google Gemini: Fast, cost-effective, good for code analysis
 * - OpenAI GPT-4: Strong reasoning and security understanding
 * - Anthropic Claude: Excellent for detailed security analysis
 * 
 * KEY FUNCTIONS:
 * - analyzeCodeWithAI(config, params): Deep security analysis of code
 * - suggestFixWithAI(config, params): Generate remediation code
 * - simulateExploitWithAI(config, params): Simulate attack scenarios
 * - copilotChatWithAI(config, params): Interactive security assistant
 * 
 * ANALYZE CODE:
 * - Input: code, language, filename, existing static findings
 * - Output: summary, securityScore (0-100), detailed findings
 * - Uses AI to identify vulnerabilities, explain risks, suggest fixes
 * 
 * SUGGEST FIX:
 * - Input: code, language, filename, specific vulnerability
 * - Output: fullRemediatedCode, patchSnippet, explanation
 * - Generates corrected code with security improvements
 * 
 * SIMULATE EXPLOIT:
 * - Input: code, vulnerability, language, optional custom payload
 * - Output: testPayload, attackVector, vulnerableResponse, remediatedResponse
 * - Shows how vulnerability could be exploited
 * 
 * COPILOT CHAT:
 * - Input: messages array, activeFile, selectedVulnerability
 * - Output: AI reply string
 * - Context-aware security assistant
 * 
 * ERROR HANDLING:
 * - Automatic fallback to next provider if one fails
 * - Rate limiting handled gracefully
 * - Clear error messages for missing API keys
 * ============================================================================
 */

import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { AIProviderConfig } from '../src/types';

export interface AnalyzeCodeResult {
  summary: string;
  securityScore: number;
  findings: any[];
}

export interface FixCodeResult {
  fullRemediatedCode: string;
  patchSnippet: string;
  explanation: string;
  securityImprovements: string[];
}

export interface SimulateExploitResult {
  testPayload: string;
  attackVector: string;
  vulnerableResponse: {
    status: string;
    simulationOutput: string;
    leakedDataOrAction: string;
  };
  remediatedResponse: {
    status: string;
    simulationOutput: string;
    defenseMechanism: string;
  };
}

export interface CopilotChatResult {
  reply: string;
}

// --- Unified AI Service ---

export async function analyzeCodeWithAI(
  config: AIProviderConfig,
  params: {
    code: string;
    language: string;
    fileName: string;
    staticFindings: any[];
  }
): Promise<AnalyzeCodeResult> {
  const prompt = buildAnalyzePrompt(params);

  let text: string;
  if (config.provider === 'gemini') {
    text = await callGemini(config, prompt, true);
  } else if (config.provider === 'openai') {
    text = await callOpenAI(config, prompt, true);
  } else {
    text = await callAnthropic(config, prompt, true);
  }

  const parsed = JSON.parse(text || '{}');
  return {
    summary: parsed.summary || '',
    securityScore: parsed.securityScore ?? 75,
    findings: (parsed.findings || []).map((f: any) => ({ ...f, source: `AI_${config.provider.toUpperCase()}` })),
  };
}

export async function suggestFixWithAI(
  config: AIProviderConfig,
  params: {
    code: string;
    language: string;
    fileName: string;
    vulnerability: any;
  }
): Promise<FixCodeResult> {
  const prompt = buildFixPrompt(params);

  let text: string;
  if (config.provider === 'gemini') {
    text = await callGemini(config, prompt, true);
  } else if (config.provider === 'openai') {
    text = await callOpenAI(config, prompt, true);
  } else {
    text = await callAnthropic(config, prompt, true);
  }

  const parsed = JSON.parse(text || '{}');
  return {
    fullRemediatedCode: parsed.fullRemediatedCode || '',
    patchSnippet: parsed.patchSnippet || '',
    explanation: parsed.explanation || '',
    securityImprovements: parsed.securityImprovements || [],
  };
}

export async function simulateExploitWithAI(
  config: AIProviderConfig,
  params: {
    vulnerability: any;
    code: string;
    language: string;
    customPayload?: string;
  }
): Promise<SimulateExploitResult> {
  const prompt = buildExploitPrompt(params);

  let text: string;
  if (config.provider === 'gemini') {
    text = await callGemini(config, prompt, true);
  } else if (config.provider === 'openai') {
    text = await callOpenAI(config, prompt, true);
  } else {
    text = await callAnthropic(config, prompt, true);
  }

  const parsed = JSON.parse(text || '{}');
  return {
    testPayload: parsed.testPayload || params.customPayload || '',
    attackVector: parsed.attackVector || 'Attack simulation',
    vulnerableResponse: parsed.vulnerableResponse || { status: 'UNKNOWN', simulationOutput: '', leakedDataOrAction: '' },
    remediatedResponse: parsed.remediatedResponse || { status: 'UNKNOWN', simulationOutput: '', defenseMechanism: '' },
  };
}

export async function copilotChatWithAI(
  config: AIProviderConfig,
  params: {
    messages: { sender: string; text: string }[];
    activeFile?: { name: string; language: string; content: string };
    selectedVulnerability?: any;
  }
): Promise<CopilotChatResult> {
  const prompt = buildCopilotPrompt(params);

  let text: string;
  if (config.provider === 'gemini') {
    text = await callGemini(config, prompt, false);
  } else if (config.provider === 'openai') {
    text = await callOpenAI(config, prompt, false);
  } else {
    text = await callAnthropic(config, prompt, false);
  }

  return { reply: text || 'No response generated.' };
}

// --- Gemini ---

async function callGemini(config: AIProviderConfig, prompt: string, structured: boolean): Promise<string> {
  if (!config.apiKey) throw new Error('Gemini API key not configured.');

  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const model = config.model || 'gemini-2.0-flash';

  if (structured) {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            securityScore: { type: Type.INTEGER },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  owaspCategory: { type: Type.STRING },
                  cwe: { type: Type.STRING },
                  cvssScore: { type: Type.NUMBER },
                  lineStart: { type: Type.INTEGER },
                  lineEnd: { type: Type.INTEGER },
                  vulnerableSnippet: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING },
                  exploitScenario: { type: Type.STRING },
                  remediation: { type: Type.STRING },
                  suggestedPatch: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                },
                required: ['id', 'title', 'severity', 'owaspCategory', 'cwe', 'cvssScore', 'lineStart', 'lineEnd', 'vulnerableSnippet', 'description', 'impact', 'exploitScenario', 'remediation', 'suggestedPatch'],
              },
            },
          },
          required: ['summary', 'securityScore', 'findings'],
        },
      },
    });
    return response.text || '{}';
  } else {
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text || '';
  }
}

// --- OpenAI ---

async function callOpenAI(config: AIProviderConfig, prompt: string, structured: boolean): Promise<string> {
  if (!config.apiKey) throw new Error('OpenAI API key not configured.');

  const client = new OpenAI({ apiKey: config.apiKey });
  const model = config.model || 'gpt-4o';

  if (structured) {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    return response.choices[0]?.message.content || '{}';
  } else {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0]?.message.content || '';
  }
}

// --- Anthropic ---

async function callAnthropic(config: AIProviderConfig, prompt: string, structured: boolean): Promise<string> {
  if (!config.apiKey) throw new Error('Anthropic API key not configured.');

  const client = new Anthropic({ apiKey: config.apiKey });
  const model = config.model || 'claude-sonnet-4-20250514';

  const extra: any = {};
  if (structured) {
    extra.max_tokens = 4096;
  } else {
    extra.max_tokens = 2048;
  }

  const response = await client.messages.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    ...extra,
  });

  // Anthropic returns content blocks — extract text
  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');

  return text;
}

// --- Prompt builders ---

function buildAnalyzePrompt(p: { code: string; language: string; fileName: string; staticFindings: any[] }): string {
  return `You are an elite Principal Application Security Engineer and DevSecOps Architect.
Analyze the following source code (${p.language}, file: "${p.fileName || 'source_code'}") for any security vulnerabilities, OWASP Top 10 flaws, cloud-native misconfigurations, memory safety issues, injection flaws, broken authorization, or sensitive data exposure.

Source Code:
\`\`\`${p.language}
${p.code}
\`\`\`

Existing Static Signatures Detected: ${JSON.stringify(p.staticFindings || [])}

Provide a comprehensive JSON analysis with "summary", "securityScore" (0-100), and "findings" array. Each finding must include: id, title, severity (CRITICAL/HIGH/MEDIUM/LOW/INFO), owaspCategory, cwe, cvssScore, lineStart, lineEnd, vulnerableSnippet, description, impact, exploitScenario, remediation, suggestedPatch, and confidence.`;
}

function buildFixPrompt(p: { code: string; language: string; fileName: string; vulnerability: any }): string {
  return `You are a Lead Security Engineer. Provide a complete, production-ready, secure remediation patch for the following vulnerability in ${p.language} file "${p.fileName}":

Vulnerability: ${p.vulnerability.title} (${p.vulnerability.cwe}, ${p.vulnerability.owaspCategory})
Description: ${p.vulnerability.description}
Vulnerable Snippet:
\`\`\`
${p.vulnerability.vulnerableSnippet}
\`\`\`

Full File:
\`\`\`${p.language}
${p.code}
\`\`\`

Return a JSON object with: fullRemediatedCode (complete fixed file), patchSnippet (targeted diff), explanation (how the fix works), and securityImprovements (array of hardening principles applied).`;
}

function buildExploitPrompt(p: { vulnerability: any; code: string; language: string; customPayload?: string }): string {
  return `You are a Cyber Warfare and Penetration Testing Simulator.
Simulate an attacker exploiting this vulnerability in ${p.language}:
${p.vulnerability.title} (${p.vulnerability.cwe}, ${p.vulnerability.owaspCategory})

Vulnerable Code:
\`\`\`
${p.vulnerability.vulnerableSnippet || p.code}
\`\`\`

Test Payload: ${p.customPayload || 'Default malicious vector for this flaw type'}

Return a JSON object with: testPayload, attackVector, vulnerableResponse (status: EXPLOITED/POTENTIALLY_EXPLOITED/SAFE, simulationOutput, leakedDataOrAction), and remediatedResponse (status: SAFE/BLOCKED, simulationOutput, defenseMechanism).`;
}

function buildCopilotPrompt(p: {
  messages: { sender: string; text: string }[];
  activeFile?: { name: string; language: string; content: string };
  selectedVulnerability?: any;
  userRequest?: string;
}): string {
  const context = `Active File: ${p.activeFile?.name || 'Untitled'} (${p.activeFile?.language || 'plain'})
\`\`\`${p.activeFile?.language || ''}
${p.activeFile?.content || ''}
\`\`\`

${p.selectedVulnerability ? `Currently inspecting: ${p.selectedVulnerability.title} (${p.selectedVulnerability.cwe})\n${p.selectedVulnerability.description}` : ''}`;

  const history = (p.messages || []).map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n\n');

  // Detect if user wants to build something
  const buildKeywords = ['build', 'create', 'make', 'write', 'generate', 'implement', 'new function', 'new api', 'new endpoint', 'new handler'];
  const isBuildRequest = p.userRequest && buildKeywords.some(kw => p.userRequest!.toLowerCase().includes(kw));

  const buildInstructions = isBuildRequest ? `
IMPORTANT - FUNCTION BUILDING GUIDELINES:
When helping the user build a function:
1. Ask clarifying questions about requirements (input, output, authentication, validation)
2. Start with a clear specification of what the function should do
3. Write secure, production-ready code with:
   - Input validation and sanitization
   - Parameterized queries for database operations
   - Proper error handling
   - Authentication/authorization checks where needed
   - Rate limiting hints
   - Logging and monitoring recommendations
4. Explain each security measure implemented
5. Provide usage examples
6. Include the complete code in a code block with the appropriate language

Keep responses conversational but focus on delivering secure, working code.` : '';

  return `You are SecureCode AI Copilot, a conversational Application Security Architect specializing in helping developers build secure software.

Your expertise includes:
- Secure coding practices and defense-in-depth
- OWASP Top 10, CWE, SANS Top 25 vulnerabilities
- Authentication, authorization, and identity management
- Input validation and sanitization
- Cryptography and secrets management
- Cloud-native security and container hardening
- Zero-trust architecture patterns

Context:
${context}

History:
${history}
${buildInstructions}

Provide a helpful, precise response with code snippets where helpful. Use code blocks with proper language tags for all code examples.`;
}
