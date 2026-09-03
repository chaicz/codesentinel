import crypto from 'crypto';
import mysql from 'mysql2/promise';
import type { NextFunction, Request, Response } from 'express';
import type { AIProviderConfig } from '../src/types';

const COOKIE_NAME = 'sentinel_sid';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

export interface AuthUser {
  id: string;
  username: string;
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

function getPool(): mysql.Pool {
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
  await p.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id          VARCHAR(36)  PRIMARY KEY,
      username    VARCHAR(32)  NOT NULL UNIQUE,
      password_hash VARCHAR(160) NOT NULL,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ai_provider VARCHAR(20)  DEFAULT 'gemini',
      ai_api_key  VARCHAR(255) DEFAULT '',
      ai_model    VARCHAR(64)  DEFAULT 'gemini-2.5-flash',
      INDEX idx_username (username)
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

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
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
    'SELECT id, username, password_hash, created_at, ai_provider, ai_api_key, ai_model FROM users WHERE username = ?',
    [username]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
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
    `INSERT INTO users (id, username, password_hash, created_at, ai_provider, ai_api_key, ai_model)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.username,
      user.passwordHash,
      user.createdAt,
      user.aiConfig?.provider || 'gemini',
      user.aiConfig?.apiKey || '',
      user.aiConfig?.model || 'gemini-2.5-flash',
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
  return { id: user.id, username: user.username, aiConfig: user.aiConfig };
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

  if (!username) {
    return res.status(400).json({
      error: 'Username must be 3–32 characters and use only letters, numbers, and underscores.',
    });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
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

    const user: UserRecord = {
      id: crypto.randomUUID(),
      username,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString(),
      aiConfig: {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'gemini-2.5-flash',
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
  if (isLoginRateLimited(req)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in a few minutes.' });
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

  try {
    await updateUserAIConfig(userId, {
      provider,
      apiKey: typeof apiKey === 'string' ? apiKey.trim() : '',
      model,
    });
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
      'SELECT id, username, ai_provider, ai_api_key, ai_model FROM users WHERE id = ?',
      [userId]
    );
    if (!rows[0]) {
      return res.status(401).json({ error: 'Sign in required.' });
    }
    const row = rows[0];
    req.user = {
      id: row.id,
      username: row.username,
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
