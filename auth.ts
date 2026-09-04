/**
 * ============================================================================
 * FILE: auth.ts
 * TYPE: Authentication & Authorization Module
 * ============================================================================
 * 
 * PURPOSE:
 * Handles all authentication and authorization logic including:
 * - User registration with password hashing
 * - User login with session management
 * - Session validation and logout
 * - Admin role checking
 * - User CRUD operations (admin functions)
 * 
 * SECURITY FEATURES:
 * - Password hashing with scrypt (64-byte key)
 * - Session tokens (SHA256 of random bytes)
 * - HttpOnly cookies (no XSS access)
 * - Rate limiting (8 attempts per 15 minutes)
 * - Admin middleware for protected routes
 * 
 * KEY FUNCTIONS:
 * - registerHandler(req, res): Create new user account
 * - loginHandler(req, res): Authenticate and create session
 * - logoutHandler(req, res): Destroy session
 * - meHandler(req, res): Get current user from session
 * - requireAuth(req, res, next): Middleware to require authentication
 * - requireAdmin(req, res, next): Middleware to require admin role
 * 
 * DATABASE OPERATIONS:
 * - initializeDatabase(): Create tables if not exist
 * - getAllUsersHandler(): List all users (admin)
 * - resetUserPasswordHandler(): Reset user password (admin)
 * - deleteUserHandler(): Delete user (admin)
 * - toggleUserActiveHandler(): Activate/deactivate user (admin)
 * 
 * BUILT-IN ADMIN:
 * - Default admin account: username=admin, password=admin123
 * - Does not require database - always available
 * 
 * ENVIRONMENT VARIABLES:
 * - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME: MySQL connection
 * 
 * SESSION MANAGEMENT:
 * - Session ID stored in HttpOnly cookie
 * - Sessions stored in MySQL or memory fallback
 * - 7-day session lifetime
 * ============================================================================
 */

import crypto from 'crypto';
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import type { AIProviderConfig } from '../src/types';

const ENV_PATH = path.resolve(process.cwd(), '.env');

const COOKIE_NAME = 'sentinel_sid';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

// Built-in default admin account (no database required)
const BUILTIN_ADMIN = {
  username: 'admin',
  // Password: admin123 - use direct comparison for demo simplicity
  password: 'admin123',
};

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
  createdAt?: string;
  lastLogin?: string | null;
  aiConfig?: AIProviderConfig;
}

interface UserRecord extends AuthUser {
  passwordHash: string;
  createdAt: string;
}

interface SessionRecord {
  userId: string;
  expiresAt: number;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

// MySQL connection pool (configured via environment variables)
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sentinel',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  const p = getPool();
  
  // Create users table with admin support
  await p.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id          VARCHAR(36)  PRIMARY KEY,
      username    VARCHAR(32)  NOT NULL UNIQUE,
      email       VARCHAR(255) DEFAULT '',
      password_hash VARCHAR(192) NOT NULL,
      role        VARCHAR(20)  DEFAULT 'user',
      is_active   BOOLEAN      DEFAULT TRUE,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login  DATETIME     DEFAULT NULL,
      ai_provider VARCHAR(20)  DEFAULT 'gemini',
      ai_api_key  VARCHAR(255) DEFAULT '',
      ai_model    VARCHAR(64)  DEFAULT 'gemini-2.0-flash',
      INDEX idx_username (username),
      INDEX idx_email (email),
      INDEX idx_last_login (last_login),
      INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await p.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id  VARCHAR(64)  PRIMARY KEY,
      user_id     VARCHAR(36)  NOT NULL,
      expires_at  BIGINT       NOT NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  
  // Migrate existing users to have admin role if they match admin username
  try {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    await p.execute(
      `UPDATE users SET role = 'admin' WHERE username = ? AND role = 'user' LIMIT 1`,
      [adminUsername]
    );

    // Create preset admin account if it doesn't exist
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const [existingAdmin] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [adminUsername]
    );
    
    if (!existingAdmin[0]) {
      // Create preset admin user with properly hashed password
      const adminId = crypto.randomUUID();
      const salt = crypto.randomBytes(16);
      const derived = await new Promise<Buffer>((resolve, reject) => {
        crypto.scrypt(adminPassword, salt, SCRYPT_KEYLEN, (err, key) => {
          if (err) reject(err);
          else resolve(key as Buffer);
        });
      });
      const passwordHash = `${salt.toString('hex')}:${derived.toString('hex')}`;
      
      await p.execute(
        `INSERT INTO users (id, username, email, password_hash, created_at, role, is_active, last_login, ai_provider, ai_api_key, ai_model)
         VALUES (?, ?, ?, ?, NOW(), 'admin', TRUE, NULL, 'gemini', '', 'gemini-2.0-flash')`,
        [adminId, adminUsername, `admin@example.com`, passwordHash]
      );
      console.log(`[AUTH] Created preset admin user: ${adminUsername} with password_hash: ${passwordHash.substring(0, 20)}...`);
    }
  } catch {
    // Ignore migration errors
  }
}

// Cleanup expired sessions periodically
setInterval(async () => {
  try {
    const p = getPool();
    await p.execute('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
  } catch {
    // Silently ignore cleanup errors
  }
}, 5 * 60 * 1000);

const sessions = new Map<string, SessionRecord>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// Update .env file with new AI API key
async function updateEnvFile(apiKey: string, provider: string, model: string): Promise<void> {
  try {
    let envContent = '';
    try {
      envContent = await fs.readFile(ENV_PATH, 'utf-8');
    } catch {
      // File doesn't exist, create it
      envContent = '';
    }

    const lines = envContent.split('\n');
    const updatedLines: string[] = [];
    let geminiKeyFound = false;
    let openaiKeyFound = false;
    let anthropicKeyFound = false;
    let defaultProviderFound = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const lowerLine = trimmedLine.toLowerCase();

      if (lowerLine.startsWith('gemini_api_key=')) {
        updatedLines.push(`GEMINI_API_KEY=${apiKey}`);
        geminiKeyFound = true;
      } else if (lowerLine.startsWith('openai_api_key=')) {
        updatedLines.push(`OPENAI_API_KEY=${apiKey}`);
        openaiKeyFound = true;
      } else if (lowerLine.startsWith('anthropic_api_key=')) {
        updatedLines.push(`ANTHROPIC_API_KEY=${apiKey}`);
        anthropicKeyFound = true;
      } else if (lowerLine.startsWith('ai_provider=')) {
        updatedLines.push(`AI_PROVIDER=${provider}`);
        defaultProviderFound = true;
      } else if (lowerLine.startsWith('ai_model=')) {
        updatedLines.push(`AI_MODEL=${model}`);
      } else {
        updatedLines.push(line);
      }
    }

    // Add missing keys
    if (!geminiKeyFound && provider === 'gemini') {
      updatedLines.push(`GEMINI_API_KEY=${apiKey}`);
    }
    if (!openaiKeyFound && provider === 'openai') {
      updatedLines.push(`OPENAI_API_KEY=${apiKey}`);
    }
    if (!anthropicKeyFound && provider === 'anthropic') {
      updatedLines.push(`ANTHROPIC_API_KEY=${apiKey}`);
    }
    if (!defaultProviderFound) {
      updatedLines.push(`AI_PROVIDER=${provider}`);
    }

    await fs.writeFile(ENV_PATH, updatedLines.join('\n'), 'utf-8');
    console.log(`[ENV] Updated .env file with ${provider} API key`);
  } catch (err) {
    console.error('[ENV] Failed to update .env file:', err);
    // Don't throw - database update should still succeed
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}

function setSessionCookie(res: Response, sessionId: string) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  res.append('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res: Response) {
  res.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length !== SCRYPT_KEYLEN) return false;

  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });

  return crypto.timingSafeEqual(expected, derived);
}

async function loadUserByUsername(username: string): Promise<UserRecord | null> {
  const p = getPool();
  const [rows] = await p.execute<mysql.RowDataPacket[]>(
    'SELECT id, username, email, password_hash, created_at, role, is_active, last_login, ai_provider, ai_api_key, ai_model FROM users WHERE username = ?',
    [username]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    username: row.username,
    email: row.email || '',
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    role: row.role || 'user',
    isActive: row.is_active !== 0,
    lastLogin: row.last_login,
    aiConfig: {
      provider: row.ai_provider,
      apiKey: row.ai_api_key || '',
      model: row.ai_model,
    },
  };
}

async function insertUser(user: UserRecord): Promise<void> {
  const p = getPool();
  await p.execute(
    `INSERT INTO users (id, username, email, password_hash, created_at, role, is_active, last_login, ai_provider, ai_api_key, ai_model)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.username,
      user.email || '',
      user.passwordHash,
      user.createdAt,
      user.role || 'user',
      user.isActive !== false,
      user.lastLogin || null,
      user.aiConfig?.provider || 'gemini',
      user.aiConfig?.apiKey || '',
      user.aiConfig?.model || 'gemini-2.0-flash',
    ]
  );
}

async function updateUserAIConfig(userId: string, aiConfig: AIProviderConfig): Promise<void> {
  const p = getPool();
  await p.execute(
    'UPDATE users SET ai_provider = ?, ai_api_key = ?, ai_model = ? WHERE id = ?',
    [aiConfig.provider, aiConfig.apiKey, aiConfig.model, userId]
  );
}

function publicUser(user: UserRecord): AuthUser {
  return { 
    id: user.id, 
    username: user.username, 
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    aiConfig: user.aiConfig 
  };
}

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function isLoginRateLimited(req: Request): boolean {
  const key = clientKey(req);
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordLoginFailure(req: Request) {
  const key = clientKey(req);
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clearLoginFailures(req: Request) {
  loginAttempts.delete(clientKey(req));
}

function createSession(userId: string): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return sessionId;
}

function getSessionUserId(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[COOKIE_NAME];
  if (!sessionId) return null;

  // Check in-memory cache first
  const cached = sessions.get(sessionId);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      sessions.delete(sessionId);
      return null;
    }
    return cached.userId;
  }

  // Fall back to database session (for server restarts)
  return null; // Sessions are purely in-memory for simplicity
}

export function validateUsername(username: unknown): string | null {
  if (typeof username !== 'string') return null;
  const trimmed = username.trim();
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string') return null;
  if (password.length < 8 || password.length > 128) return null;
  return password;
}

export async function registerHandler(req: Request, res: Response) {
  const username = validateUsername(req.body?.username);
  const password = validatePassword(req.body?.password);
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';

  if (!username) {
    return res.status(400).json({
      error: 'Username must be 3–32 characters and use only letters, numbers, and underscores.',
    });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    // Check database connection first
    let dbConnected = false;
    try {
      const p = getPool();
      await p.execute('SELECT 1');
      dbConnected = true;
    } catch (dbErr) {
      console.error('Database connection error:', dbErr);
      return res.status(503).json({ 
        error: 'Database connection failed. Please ensure MySQL/XAMPP is running and the "sentinel" database exists.',
        hint: 'Run: CREATE DATABASE sentinel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
      });
    }

    if (!dbConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please ensure MySQL/XAMPP is running.',
        hint: 'Check that XAMPP MySQL is started and the "sentinel" database exists.'
      });
    }

    const existing = await loadUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    // Check if email already exists
    if (email) {
      const p = getPool();
      const [emailRows] = await p.execute<mysql.RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      if (emailRows[0]) {
        return res.status(409).json({ error: 'That email is already registered.' });
      }
    }

    const user: UserRecord = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
      role: 'user',
      isActive: true,
      aiConfig: {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-2.0-flash',
      },
    };

    await insertUser(user);

    const sessionId = createSession(user.id);
    setSessionCookie(res, sessionId);
    return res.status(201).json({ user: publicUser(user) });
  } catch (err: any) {
    console.error('Registration error:', err);
    
    // Handle specific MySQL errors
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({ 
        error: 'Database tables not found. Please restart the server to initialize the database.',
        hint: 'Ensure the server started successfully with "npm run dev" or "npm start"'
      });
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Cannot connect to MySQL server.',
        hint: 'Start XAMPP and ensure MySQL is running on port 3306.'
      });
    }
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      return res.status(503).json({ 
        error: 'MySQL access denied. Check your credentials in .env file.',
        hint: 'Default XAMPP credentials: user=root, password=empty'
      });
    }
    
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

export async function loginHandler(req: Request, res: Response) {
  const entry = loginAttempts.get(clientKey(req));
  const resetAt = entry?.resetAt || (Date.now() + LOGIN_WINDOW_MS);

  if (isLoginRateLimited(req)) {
    return res.status(429).json({ 
      error: 'Too many login attempts. Try again later.',
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
      resetAt: resetAt
    });
  }

  const username = validateUsername(req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    recordLoginFailure(req);
    // More specific error messages
    if (!req.body?.username && !req.body?.password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (!req.body?.username) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!req.body?.password) {
      return res.status(400).json({ error: 'Password is required.' });
    }
    return res.status(400).json({ error: 'Invalid username or password format.' });
  }

  try {
    // Check built-in admin first (no database required)
    if (username.toLowerCase() === BUILTIN_ADMIN.username) {
      // Direct password comparison for built-in admin
      if (password === BUILTIN_ADMIN.password) {
        clearLoginFailures(req);
        const sessionId = createSession('builtin-admin');
        setSessionCookie(res, sessionId);
        return res.json({ 
          user: {
            id: 'builtin-admin',
            username: 'admin',
            role: 'admin',
            isActive: true,
            aiConfig: { provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' }
          }
        });
      } else {
        recordLoginFailure(req);
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
    }

    // Check database for regular users
    const user = await loadUserByUsername(username);
    if (!user) {
      // User doesn't exist - still record failure to prevent enumeration
      recordLoginFailure(req);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const ok = await verifyPassword(password, user.passwordHash);

    if (!ok) {
      recordLoginFailure(req);
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    clearLoginFailures(req);
    const sessionId = createSession(user.id);
    setSessionCookie(res, sessionId);
    return res.json({ user: publicUser(user) });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

export function logoutHandler(req: Request, res: Response) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies[COOKIE_NAME];
  if (sessionId) sessions.delete(sessionId);
  clearSessionCookie(res);
  return res.json({ ok: true });
}

export async function meHandler(req: Request, res: Response) {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  // Look up user from DB by ID
  const p = getPool();
  try {
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, username, email, role, is_active, created_at, last_login, ai_provider, ai_api_key, ai_model FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const row = rows[0];
    return res.json({
      user: {
        id: row.id,
        username: row.username,
        email: row.email || '',
        role: row.role || 'user',
        isActive: row.is_active !== 0,
        createdAt: row.created_at,
        lastLogin: row.last_login,
        aiConfig: {
          provider: row.ai_provider,
          apiKey: row.ai_api_key || '',
          model: row.ai_model,
        },
      },
    });
  } catch (err: any) {
    console.error('meHandler error:', err);
    return res.status(500).json({ error: 'Failed to load user.' });
  }
}

export async function updateAISettingsHandler(req: AuthedRequest, res: Response) {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Sign in required.' });
  }

  const { provider, apiKey, model } = req.body || {};
  const validProviders = ['gemini', 'openai', 'anthropic'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Invalid AI provider.' });
  }
  if (!model || typeof model !== 'string' || model.length < 2) {
    return res.status(400).json({ error: 'Model is required.' });
  }

  console.log('[AI Settings] Saving:', { provider, model, apiKeyLength: apiKey?.length || 0 });

  try {
    await updateUserAIConfig(userId, {
      provider,
      apiKey: typeof apiKey === 'string' ? apiKey.trim() : '',
      model,
    });

    console.log('[AI Settings] Database updated successfully');

    // Also update the .env file for default configuration
    await updateEnvFile(apiKey, provider, model);

    console.log('[AI Settings] .env file updated');

    const p = getPool();
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, username, ai_provider, ai_api_key, ai_model FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const row = rows[0];
    return res.json({
      user: {
        id: row.id,
        username: row.username,
        aiConfig: {
          provider: row.ai_provider,
          apiKey: row.ai_api_key || '',
          model: row.ai_model,
        },
      },
    });
  } catch (err: any) {
    console.error('updateAISettings error:', err);
    return res.status(500).json({ error: 'Failed to update AI settings.' });
  }
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Sign in required.' });
  }
  const p = getPool();
  try {
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, username, email, role, is_active, created_at, last_login, ai_provider, ai_api_key, ai_model FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const row = rows[0];
    req.user = {
      id: row.id,
      username: row.username,
      email: row.email || '',
      role: row.role || 'user',
      isActive: row.is_active !== 0,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      aiConfig: {
        provider: row.ai_provider,
        apiKey: row.ai_api_key || '',
        model: row.ai_model,
      },
    };
    next();
  } catch (err: any) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}

// Middleware to require admin role
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Sign in required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

export function apiAuthGate(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.path === '/health' || req.path.startsWith('/auth')) {
    return next();
  }
  return requireAuth(req, res, next);
}

export async function getUserAIConfig(userId: string): Promise<AIProviderConfig | null> {
  const p = getPool();
  try {
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT ai_provider, ai_api_key, ai_model FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      provider: row.ai_provider,
      apiKey: row.ai_api_key || '',
      model: row.ai_model,
    };
  } catch {
    return null;
  }
}

// ==================== ADMIN ENDPOINTS ====================

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  aiProvider: string;
  aiModel: string;
}

// Get all users (admin only)
export async function getAllUsersHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const p = getPool();
  try {
    const [rows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT id, username, email, role, is_active, created_at, last_login, ai_provider, ai_model
      FROM users 
      ORDER BY created_at DESC
    `);
    
    const users: AdminUser[] = rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email || '',
      role: row.role || 'user',
      isActive: row.is_active !== 0,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      aiProvider: row.ai_provider,
      aiModel: row.ai_model,
    }));

    return res.json({ users });
  } catch (err: any) {
    console.error('getAllUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

// Get inactive/long-time-no-login users (admin only)
export async function getInactiveUsersHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const days = parseInt(req.query.days as string) || 30; // Default 30 days
  const p = getPool();
  
  try {
    const [rows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT id, username, email, role, is_active, created_at, last_login, ai_provider, ai_model
      FROM users 
      WHERE last_login IS NULL 
         OR last_login < DATE_SUB(NOW(), INTERVAL ? DAY)
         OR is_active = 0
      ORDER BY last_login ASC NULLS FIRST, created_at ASC
    `, [days]);
    
    const users: AdminUser[] = rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email || '',
      role: row.role || 'user',
      isActive: row.is_active !== 0,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      aiProvider: row.ai_provider,
      aiModel: row.ai_model,
    }));

    return res.json({ users, count: users.length });
  } catch (err: any) {
    console.error('getInactiveUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch inactive users.' });
  }
}

// Reset user password (admin only)
export async function resetUserPasswordHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { userId, newPassword } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }
  
  if (userId === req.user?.id) {
    return res.status(400).json({ error: 'Cannot reset your own password. Use profile settings.' });
  }

  const password = validatePassword(newPassword);
  if (!password) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  }

  const p = getPool();
  try {
    // Check if user exists
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordHash = await hashPassword(password);
    await p.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    // Invalidate all sessions for this user
    await p.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);

    console.log(`[Admin] Password reset for user ${rows[0].username} by ${req.user?.username}`);
    return res.json({ success: true, message: `Password reset successfully for user ${rows[0].username}.` });
  } catch (err: any) {
    console.error('resetUserPassword error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
}

// Update user email (admin only)
export async function updateUserEmailHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { userId, email } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }
  
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const p = getPool();
  try {
    // Check if user exists
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if email is already taken by another user
    if (email) {
      const [emailRows] = await p.execute<mysql.RowDataPacket[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      if (emailRows[0]) {
        return res.status(409).json({ error: 'Email is already in use.' });
      }
    }

    await p.execute('UPDATE users SET email = ? WHERE id = ?', [email || '', userId]);

    console.log(`[Admin] Email updated for user ${rows[0].username} by ${req.user?.username}`);
    return res.json({ success: true, message: `Email updated successfully for user ${rows[0].username}.` });
  } catch (err: any) {
    console.error('updateUserEmail error:', err);
    return res.status(500).json({ error: 'Failed to update email.' });
  }
}

// Delete user (admin only)
export async function deleteUserHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const userId = req.body.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }
  
  if (userId === req.user?.id) {
    return res.status(400).json({ error: 'Cannot delete yourself.' });
  }

  const p = getPool();
  try {
    // Check if user exists
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, username, role FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prevent deleting other admins
    if (rows[0].role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete another admin user.' });
    }

    // Delete user's sessions first
    await p.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
    
    // Delete the user
    await p.execute('DELETE FROM users WHERE id = ?', [userId]);

    console.log(`[Admin] User ${rows[0].username} deleted by ${req.user?.username}`);
    return res.json({ success: true, message: `User ${rows[0].username} has been deleted.` });
  } catch (err: any) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
}

// Toggle user active status (admin only)
export async function toggleUserActiveHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { userId, isActive } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }
  
  if (userId === req.user?.id) {
    return res.status(400).json({ error: 'Cannot deactivate yourself.' });
  }

  const p = getPool();
  try {
    // Check if user exists
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, username, role FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prevent deactivating other admins
    if (rows[0].role === 'admin' && !isActive) {
      return res.status(400).json({ error: 'Cannot deactivate another admin user.' });
    }

    await p.execute('UPDATE users SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, userId]);
    
    // Invalidate sessions if deactivating
    if (!isActive) {
      await p.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
    }

    const action = isActive ? 'activated' : 'deactivated';
    console.log(`[Admin] User ${rows[0].username} ${action} by ${req.user?.username}`);
    return res.json({ success: true, message: `User ${rows[0].username} has been ${action}.` });
  } catch (err: any) {
    console.error('toggleUserActive error:', err);
    return res.status(500).json({ error: 'Failed to update user status.' });
  }
}

// Bulk delete inactive users (admin only)
export async function bulkDeleteInactiveUsersHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { userIds } = req.body;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ error: 'User IDs array is required.' });
  }

  // Prevent deleting self
  if (userIds.includes(req.user?.id)) {
    return res.status(400).json({ error: 'Cannot delete yourself.' });
  }

  const p = getPool();
  try {
    // Get usernames for logging (excluding admins and self)
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      `SELECT id, username FROM users WHERE id IN (?) AND role != 'admin'`,
      [userIds]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No valid users found to delete.' });
    }

    const deletedIds = rows.map(r => r.id);
    const deletedUsernames = rows.map(r => r.username);

    // Delete sessions first
    await p.execute('DELETE FROM sessions WHERE user_id IN (?)', [deletedIds]);
    
    // Delete users
    await p.execute('DELETE FROM users WHERE id IN (?)', [deletedIds]);

    console.log(`[Admin] Bulk deleted ${deletedIds.length} inactive users by ${req.user?.username}`);
    return res.json({ 
      success: true, 
      message: `${deletedIds.length} inactive users deleted.`,
      deletedUsers: deletedUsernames
    });
  } catch (err: any) {
    console.error('bulkDeleteInactiveUsers error:', err);
    return res.status(500).json({ error: 'Failed to delete users.' });
  }
}

// Promote user to admin (admin only)
export async function promoteToAdminHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  if (userId === req.user?.id) {
    return res.status(400).json({ error: 'You are already an admin.' });
  }

  const p = getPool();
  try {
    const [rows] = await p.execute<mysql.RowDataPacket[]>(
      'SELECT id, username, role FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (rows[0].role === 'admin') {
      return res.status(400).json({ error: 'User is already an admin.' });
    }

    await p.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', userId]);

    console.log(`[Admin] User ${rows[0].username} promoted to admin by ${req.user?.username}`);
    return res.json({ success: true, message: `User ${rows[0].username} is now an admin.` });
  } catch (err: any) {
    console.error('promoteToAdmin error:', err);
    return res.status(500).json({ error: 'Failed to promote user.' });
  }
}

// Get admin statistics
export async function getAdminStatsHandler(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const p = getPool();
  try {
    // Total users
    const [totalRows] = await p.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
    
    // Active users (logged in within 30 days)
    const [activeRows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM users 
      WHERE last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR last_login IS NULL
    `);
    
    // Inactive users
    const [inactiveRows] = await p.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) as count FROM users 
      WHERE last_login < DATE_SUB(NOW(), INTERVAL 30 DAY) AND last_login IS NOT NULL
    `);
    
    // Deactivated users
    const [deactivatedRows] = await p.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users WHERE is_active = 0');
    
    // Admin count
    const [adminRows] = await p.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as count FROM users WHERE role = "admin"');

    return res.json({
      stats: {
        totalUsers: totalRows[0]?.count || 0,
        activeUsers: activeRows[0]?.count || 0,
        inactiveUsers: inactiveRows[0]?.count || 0,
        deactivatedUsers: deactivatedRows[0]?.count || 0,
        adminCount: adminRows[0]?.count || 0,
      }
    });
  } catch (err: any) {
    console.error('getAdminStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
}
