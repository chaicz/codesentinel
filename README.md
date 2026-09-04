# Sentinel IDE — Secure Coding Assistant

<div align="center">

![Sentinel Banner](https://img.shields.io/badge/Sentinel-IDE-14B8A6?style=for-the-badge&logo=shield&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-XAMPP-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.apachefriends.org/)

**Real-time security analysis, vulnerability detection, and AI-powered remediation for developers.**

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation Guide](#-installation-guide)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Default Accounts](#-default-accounts)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- **Live Static Analysis** — Scans code as you type for OWASP Top 10, CWE weaknesses, and custom rules
- **AI Taint Tracking** — Semantic analysis powered by Gemini, OpenAI, or Anthropic
- **Automated Remediation** — One-click patches with side-by-side diff view
- **Exploit Simulation** — Safe, sandboxed proof-of-concept generation
- **Security Copilot** — Chat assistant for security best practices and remediation guidance
- **Code Execution Sandbox** — Run Python, JavaScript, Go, C, Rust, and more with runtime security alerts
- **SARIF Export** — Generate industry-standard security reports for CI/CD pipelines
- **Admin Dashboard** — User management, statistics, and bulk operations for administrators

---

## 🔧 Prerequisites

Before installing Sentinel, ensure you have the following installed on your system:

| Requirement | Version | Purpose | Download |
|-------------|---------|---------|----------|
| **Node.js** | 18+ | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **XAMPP** | Latest | MySQL database server | [apachefriends.org](https://www.apachefriends.org/) |
| **Git** | Latest | Version control | [git-scm.com](https://git-scm.com/) |

### Optional (for AI features)

| Requirement | Purpose | Download |
|-------------|---------|----------|
| **Gemini API Key** | Google AI analysis | [aistudio.google.com](https://aistudio.google.com/) |
| **OpenAI API Key** | GPT-4 analysis | [platform.openai.com](https://platform.openai.com/) |
| **Anthropic API Key** | Claude analysis | [console.anthropic.com](https://console.anthropic.com/) |

---

## 📥 Installation Guide

### Step 1: Install Node.js

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS** (Long Term Support) version
3. Run the installer and follow the prompts
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Step 2: Install XAMPP

1. Go to [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. Download XAMPP for Windows
3. Run the installer
4. **Important**: Select only **MySQL** (uncheck other components to save space)
5. Install to default location: `C:\xampp`
6. Complete installation

### Step 3: Install Git (if not already installed)

1. Go to [https://git-scm.com/](https://git-scm.com/)
2. Download for Windows
3. Run installer with default options
4. Verify installation:
   ```bash
   git --version
   ```

### Step 4: Clone the Repository

```bash
# Open Command Prompt or PowerShell
cd D:\
git clone https://github.com/YOUR_USERNAME/codesentinel.git
cd codesentinel
```

### Step 5: Install Project Dependencies

```bash
npm install
```

This will install all required packages including:
- Express.js (backend server)
- React 19 (frontend)
- Monaco Editor (code editor)
- MySQL2 (database driver)
- Vite (build tool)

---

## 🚀 Quick Start

### Step 1: Start XAMPP MySQL

1. Open **XAMPP Control Panel** (usually at `C:\xampp\xampp-control.exe`)
2. Click **Start** next to **MySQL**
3. Wait until it shows green status
4. Keep XAMPP running in the background

### Step 2: Create the Database and Admin User

**Quick Setup (Recommended)**

Run the admin setup script to create the database and admin account in one step:

```bash
# Generate and run SQL for admin user
node setup-admin-generate.js
```

Copy the SQL output and run it in:
- **phpMyAdmin**: `http://localhost/phpmyadmin` → Select "sentinel" database → SQL tab
- **MySQL CLI**: `mysql -u root -p < output.sql`

**Manual Setup**

1. Create database using `setup.sql`:
```bash
mysql -u root -p < setup.sql
```

2. The admin account (`admin` / `admin123`) will be **automatically created** when you first run the app.

Or manually insert admin using phpMyAdmin:
1. Go to `http://localhost/phpmyadmin`
2. Select `sentinel` database
3. Click **Insert** on the users table
4. Fill in:
   - `username`: `admin`
   - `password_hash`: (generate using `node setup-admin-generate.js`)
   - `role`: `admin`
   - `is_active`: `TRUE`

### Step 3: Configure Environment

```bash
# Copy the example environment file
copy .env.example .env
```

Edit `.env` with your settings (or use defaults for local development):

```env
# MySQL Configuration (defaults work for XAMPP)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=sentinel

# AI Configuration (optional - enables AI features)
# Get your API key from the respective AI platform
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Step 4: Start the Server

```bash
# Development mode (with hot reload)
npm run dev
```

The server will start at `http://localhost:3000`

### Step 5: Access the Application

1. Open your browser
2. Go to: `http://localhost:3000`
3. Login with default credentials (see below)

---

## 🔐 Default Accounts

### Preset Admin Account

**Automatically created on first server run**, or use the setup script:

```bash
node setup-admin-generate.js
```

- **Username**: `admin`
- **Password**: `admin123`

Or set custom credentials via environment variables:
```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
```

### Test User Account (Optional)

Created by `setup.sql`:
- **Username**: `testuser`
- **Password**: `testpass123`

> ⚠️ **Security Warning**: Change these default passwords in production!

> **Note**: The admin account is created automatically by `auth.ts` during `initializeDatabase()`. You only need manual setup if the auto-creation fails.

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MYSQL_HOST` | `localhost` | MySQL server host |
| `MYSQL_PORT` | `3306` | MySQL server port |
| `MYSQL_USER` | `root` | MySQL username |
| `MYSQL_PASSWORD` | `(empty)` | MySQL password |
| `MYSQL_DATABASE` | `sentinel` | Database name |
| `ADMIN_USERNAME` | `admin` | Default admin username |
| `ADMIN_PASSWORD` | `admin123` | Default admin password |
| `GEMINI_API_KEY` | - | Google Gemini API key |
| `OPENAI_API_KEY` | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | - | Anthropic API key |
| `NODE_ENV` | `development` | `production` for production |

### AI Provider Configuration

After logging in, configure AI settings via the UI:
1. Click on your username in the header
2. Go to **AI Settings**
3. Select provider: **Gemini**, **OpenAI**, or **Anthropic**
4. Enter your API key
5. Choose a model (defaults provided)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript + Tailwind CSS |
| **Editor** | Monaco Editor |
| **Backend** | Express.js + Vite (development) |
| **Auth** | scrypt hashing + HttpOnly cookie sessions |
| **Database** | MySQL (via XAMPP) |
| **AI** | Gemini · OpenAI · Anthropic |

---

## 📁 Project Structure

```
codesentinel/
├── auth.ts                 # Authentication: scrypt hashing, sessions, register/login
├── aiService.ts            # AI service: Gemini, OpenAI, Anthropic wrappers
├── server.ts               # Express server: API routes, code execution sandbox
├── setup.sql               # MySQL schema + default test user
├── .env.example            # Environment variable template
│
├── src/
│   ├── App.tsx             # Main app: state, scan orchestration
│   ├── types.ts            # Shared TypeScript types
│   ├── main.tsx            # React entry point
│   ├── index.css           # Global styles (Tailwind)
│   │
│   ├── components/
│   │   ├── LoginScreen.tsx       # Auth UI (login / register)
│   │   ├── Header.tsx             # Top bar with controls
│   │   ├── CodeEditor.tsx        # Monaco editor + output panel
│   │   ├── VulnerabilityList.tsx  # Findings panel
│   │   ├── SecurityCopilotChat.tsx # AI chat sidebar
│   │   ├── DiffModal.tsx         # Patch preview & apply
│   │   ├── ExploitSimulatorModal.tsx # Exploit simulation
│   │   ├── AdminPanel.tsx        # Admin user management
│   │   ├── Dashboard.tsx         # Security dashboard
│   │   ├── AuditReportModal.tsx  # Security audit report
│   │   ├── SarifModal.tsx        # SARIF export
│   │   └── ...
│   │
│   ├── data/
│   │   └── presetFiles.ts        # Sample vulnerable code files
│   │
│   └── utils/
│       └── staticAnalyzer.ts     # 60+ vulnerability patterns (CWE/OWASP)
│
├── dist/                   # Production build output
├── node_modules/          # Dependencies
├── package.json           # Project dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── README.md              # This file
```

---

## 🔧 Troubleshooting

### "Cannot connect to MySQL" error

1. Ensure XAMPP is running with MySQL started
2. Check that MySQL is running on port 3306
3. Verify `.env` has correct credentials

### "Database 'sentinel' doesn't exist" error

Run the `setup.sql` script:
```bash
mysql -u root -p < setup.sql
```

### Port 3000 already in use

Change the port in `server.ts` or kill the existing process:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill by PID
taskkill /PID <PID> /F
```

### Node.js version mismatch

Ensure you have Node.js 18+:
```bash
node --version  # Should be 18.x.x or higher
```

### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rmdir /s /q node_modules
npm install
```

### AI features not working

1. Check that you have an API key configured
2. Verify the API key is valid and has quota remaining
3. Check `.env` file is in the project root

### Session expired / Not logged in

1. Clear browser cookies for localhost
2. Check that cookies are enabled in your browser
3. Ensure you're accessing the correct URL (http://localhost:3000)

---

## 💻 Development

### Available Scripts

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run lint

# Clean build artifacts
npm run clean
```

### Production Deployment

```bash
# Build the application
npm run build

# Set environment to production
set NODE_ENV=production

# Start the server
npm start
```

### Database Schema

The application automatically creates required tables on startup. For manual setup, see `setup.sql`.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OWASP Top 10 for security vulnerability guidelines
- CWE for weakness classification
- Monaco Editor for the code editing experience
- Google, OpenAI, and Anthropic for AI capabilities

---

<div align="center">

**Built with ❤️ for secure coding**

</div>
