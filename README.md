# Sentinel IDE — Secure Coding Assistant

<div align="center">

![Sentinel Banner](https://img.shields.io/badge/Sentinel-IDE-14B8A6?style=for-the-badge&logo=shield&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

**Real-time security analysis, vulnerability detection, and AI-powered remediation for developers.**

</div>

---

## Features

- **Live Static Analysis** — Scans code as you type for OWASP Top 10, CWE weaknesses, and custom rules
- **AI Taint Tracking** — Semantic analysis powered by Gemini, OpenAI, or Anthropic
- **Automated Remediation** — One-click patches with side-by-side diff view
- **Exploit Simulation** — Safe, sandboxed proof-of-concept generation
- **Security Copilot** — Chat assistant for security best practices and remediation guidance
- **Code Execution Sandbox** — Run Python, JavaScript, Go, C, Rust, and more with runtime security alerts
- **SARIF Export** — Generate industry-standard security reports for CI/CD pipelines

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS |
| Editor | Monaco Editor |
| Backend | Express.js + Vite (dev) |
| Auth | scrypt hashing + HttpOnly cookie sessions |
| Database | MySQL (XAMPP) |
| AI | Gemini · OpenAI · Anthropic |

## Prerequisites

- **Node.js** 18+
- **XAMPP** with MySQL running on port 3306
- A Gemini / OpenAI / Anthropic API key (optional — enables AI features)

## Setup

### 1. Database

Open **phpMyAdmin** (`http://localhost/phpmyadmin`) → **SQL** tab → paste the contents of `setup.sql` and click **Go**.

Or via CLI:
```bash
mysql -u root -p < setup.sql
```

This creates the `sentinel` database, `users` table, and a default test user.

### 2. Configure Environment

Copy the example env file:
```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=           # leave empty for default XAMPP
MYSQL_DATABASE=sentinel

# Optional: enable AI features
GEMINI_API_KEY=your_key_here
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Default test account:**
- Username: `testuser`
- Password: `testpass123`

## Production Build

```bash
npm run build
npm start
```

Static assets are served from `dist/`. Set `NODE_ENV=production` to enable optimized builds.

## Project Structure

```
├── auth.ts                  # Auth: scrypt hashing, sessions, register/login/requireAuth
├── aiService.ts             # AI: Gemini, OpenAI, Anthropic wrappers for analysis & fixes
├── server.ts                # Express server: API routes, sandboxed code execution
├── setup.sql                # MySQL schema + default test user
├── .env.example             # Environment variable template
│
├── src/
│   ├── App.tsx              # Main app: state, scan orchestration, modal orchestration
│   ├── types.ts              # Shared TypeScript types
│   ├── components/
│   │   ├── LoginScreen.tsx   # Auth UI (login / register)
│   │   ├── Header.tsx        # Top bar: file tabs, scan controls, user badge
│   │   ├── CodeEditor.tsx    # Monaco editor + output panel
│   │   ├── VulnerabilityList.tsx  # Findings panel
│   │   ├── SecurityCopilotChat.tsx # AI chat sidebar
│   │   ├── DiffModal.tsx     # Patch preview & apply
│   │   └── ...
│   └── utils/
│       └── staticAnalyzer.ts # Rule engine: 60+ vulnerability patterns (CWE/OWASP)
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License
