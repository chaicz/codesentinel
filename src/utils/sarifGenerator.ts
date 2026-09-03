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
