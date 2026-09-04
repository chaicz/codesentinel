/**
 * ============================================================================
 * FILE: sarifGenerator.ts
 * TYPE: SARIF Report Generator Utility
 * ============================================================================
 * 
 * PURPOSE:
 * Converts CodeSentinel vulnerability findings into SARIF (Static Analysis
 * Results Interchange Format) 2.1.0 format for CI/CD integration.
 * 
 * SARIF IS:
 * An OASIS standard format for sharing security analysis results between
 * different tools and platforms. Supported by GitHub, Azure DevOps, and others.
 * 
 * KEY FUNCTION:
 * - generateSarifReport(file, vulnerabilities): Converts findings to SARIF JSON
 * 
 * OUTPUT STRUCTURE:
 * - version: SARIF 2.1.0
 * - runs[].tool.driver: Tool info (SecureCode-AI)
 * - runs[].results: Array of vulnerability findings
 * - Each result includes: location, severity, CWE, description, remediation
 * 
 * INTEGRATIONS:
 * - GitHub Code Scanning: github/codeql-action/upload-sarif
 * - Azure DevOps: SARIF artifact uploads
 * - GitLab SAST: Native SARIF support
 * 
 * SEVERITY MAPPING:
 * - CRITICAL/HIGH → "error"
 * - MEDIUM/LOW/INFO → "warning"
 * 
 * PROPERTIES:
 * - securitySeverity: CVSS score as string
 * - tags: ["security", OWASP category, severity, CWE]
 * ============================================================================
 */

import { Vulnerability, CodeFile } from '../types';

export function generateSarifReport(file: CodeFile, vulnerabilities: Vulnerability[]): object {
  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "SecureCode-AI",
            version: "2.4.0",
            informationUri: "https://ai.studio/build",
            rules: vulnerabilities.map((v) => ({
              id: v.cwe || v.id,
              name: v.title,
              shortDescription: {
                text: v.title
              },
              fullDescription: {
                text: v.description
              },
              help: {
                text: `${v.description}\n\nRemediation:\n${v.remediation}\n\nOWASP Category: ${v.owaspCategory}`
              },
              properties: {
                tags: [
                  "security",
                  v.owaspCategory,
                  v.severity.toLowerCase(),
                  v.cwe
                ],
                securitySeverity: v.cvssScore.toString(),
                problem: {
                  severity: v.severity === 'CRITICAL' || v.severity === 'HIGH' ? 'error' : 'warning'
                }
              }
            }))
          }
        },
        results: vulnerabilities.map((v) => ({
          ruleId: v.cwe || v.id,
          message: {
            text: `${v.title}: ${v.description}`
          },
          level: v.severity === 'CRITICAL' || v.severity === 'HIGH' ? 'error' : v.severity === 'MEDIUM' ? 'warning' : 'note',
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: file.name,
                  uriBaseId: "%SRCROOT%"
                },
                region: {
                  startLine: v.lineStart,
                  endLine: v.lineEnd,
                  snippet: {
                    text: v.vulnerableSnippet
                  }
                }
              }
            }
          ]
        }))
      }
    ]
  };

  return sarif;
}
