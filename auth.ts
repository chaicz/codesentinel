import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import type { AIProviderConfig } from '../src/types';

const USERS_PATH = path.join(process.cwd(), 'data', 'users.json');
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

interface UsersFile {
  users: UserRecord[];
}

interface SessionRecord {
  userId: string;
  expiresAt: number;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

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

async function loadUsers(): Promise<UserRecord[]> {
  try {
    const raw = await fs.readFile(USERS_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as UsersFile;
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch (err: any) {
    if (err?.code === 'ENOENT') return [];
    throw err;
  }
}

async function saveUsers(users: UserRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify({ users }, null, 2), 'utf-8');
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
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return session.userId;
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

  const users = await loadUsers();
  if (users.some((u) => u.username === username)) {
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
  users.push(user);
  await saveUsers(users);

  const sessionId = createSession(user.id);
  setSessionCookie(res, sessionId);
  return res.status(201).json({ user: publicUser(user) });
}

export async function loginHandler(req: Request, res: Response) {
  if (isLoginRateLimited(req)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in a few minutes.' });
  }

  const username = validateUsername(req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    recordLoginFailure(req);
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const users = await loadUsers();
  const user = users.find((u) => u.username === username);
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    recordLoginFailure(req);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  clearLoginFailures(req);
  const sessionId = createSession(user.id);
  setSessionCookie(res, sessionId);
  return res.json({ user: publicUser(user) });
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
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  return res.json({ user: publicUser(user) });
}

export async function updateAISettingsHandler(req: AuthedRequest, res: Response) {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const { provider, apiKey, model } = req.body || {};
  const validProviders = ['gemini', 'openai', 'anthropic'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({ error: 'Invalid AI provider.' });
  }
  if (!model || typeof model !== 'string' || model.length < 2) {
    return res.status(400).json({ error: 'Model is required.' });
  }

  const users = await loadUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  users[idx].aiConfig = {
    provider,
    apiKey: typeof apiKey === 'string' ? apiKey.trim() : '',
    model,
  };
  await saveUsers(users);

  return res.json({ user: publicUser(users[idx]) });
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const userId = getSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Sign in required.' });
  }
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'Sign in required.' });
  }
  req.user = publicUser(user);
  next();
}

export function apiAuthGate(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.path === '/health' || req.path.startsWith('/auth')) {
    return next();
  }
  return requireAuth(req, res, next);
}

export async function getUserAIConfig(userId: string): Promise<AIProviderConfig | null> {
  const users = await loadUsers();
  const user = users.find((u) => u.id === userId);
  return user?.aiConfig || null;
}
