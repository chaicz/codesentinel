-- ============================================================================
-- SENTINEL IDE — Database Setup Script
-- Compatible with: MySQL 8+ (XAMPP / MariaDB)
-- Run this in phpMyAdmin → SQL tab, or via MySQL CLI:
--   mysql -u root -p < setup.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- DESIGN FILE: users
-- Core Function: Stores registered user accounts and their AI provider settings.
--                This is the primary identity table for the application.
-- Usage: Queried on every login, register, and auth-protected API call.
-- ---------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS sentinel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sentinel;

CREATE TABLE IF NOT EXISTS users (
  id             VARCHAR(36)   PRIMARY KEY COMMENT '[DESIGN] UUID primary key — unique per user account',
  username       VARCHAR(32)   NOT NULL UNIQUE COMMENT '[DESIGN] User handle (3–32 chars, a-z/0-9/_), shown in the UI header',
  password_hash  VARCHAR(160)  NOT NULL COMMENT '[CORE FUNCTION] scrypt hash — salt:hex (16 bytes) + derived key (64 bytes), never stored in plaintext',
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '[DESIGN] Account creation timestamp, displayed in profile / audit logs',
  ai_provider    VARCHAR(20)   DEFAULT 'gemini' COMMENT '[DESIGN] Active AI provider — gemini | openai | anthropic — set in AI Settings modal',
  ai_api_key    VARCHAR(255)  DEFAULT '' COMMENT '[DESIGN] Encrypted API key for the chosen provider — stored per-user, used by aiService.ts',
  ai_model       VARCHAR(64)   DEFAULT 'gemini-2.5-flash' COMMENT '[DESIGN] Model identifier string passed to the AI provider on every request',
  INDEX idx_username (username) COMMENT '[CORE FUNCTION] Indexed for O(1) lookup during login and registration'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='[CORE FUNCTION] User identity and preferences store';

-- ---------------------------------------------------------------------------
-- DESIGN FILE: sessions
-- Core Function: Tracks active browser sessions so users stay logged in across
--                page refreshes. Sessions are stored in-memory on the server
--                for performance; this table serves as a persistence layer
--                for server restarts (currently unused but ready for expansion).
-- Usage: Read on every authenticated API request via cookie parsing.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  session_id   VARCHAR(64)  PRIMARY KEY COMMENT '[DESIGN] Random 32-byte hex token — set as HttpOnly SameSite=Lax cookie',
  user_id      VARCHAR(36)  NOT NULL COMMENT '[DESIGN] FK to users.id — links this session to a specific account',
  expires_at   BIGINT       NOT NULL COMMENT '[CORE FUNCTION] Unix timestamp (ms) — session invalidated after this time (7 days TTL)',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '[DESIGN] Session start time — useful for audit / active-session views',
  INDEX idx_user_id (user_id) COMMENT '[DESIGN] Indexed for fast session invalidation on logout',
  INDEX idx_expires_at (expires_at) COMMENT '[CORE FUNCTION] Indexed for efficient expired-session cleanup queries',
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='[CORE FUNCTION] Session persistence layer (in-memory cache used at runtime)';

-- ---------------------------------------------------------------------------
-- DESIGN FILE: projects (future expansion)
-- Core Function: Reserved for multi-project support. Currently projects are
--                stored in localStorage in the browser. This table is scaffolded
--                for when server-side project storage is implemented.
-- ---------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS projects (
--   id          VARCHAR(36)  PRIMARY KEY,
--   user_id     VARCHAR(36)  NOT NULL,
--   name        VARCHAR(128) NOT NULL,
--   description TEXT,
--   created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   INDEX idx_user_id (user_id)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- DEFAULT TEST USER
-- Username: testuser
-- Password: testpass123
-- Purpose:  Pre-created account for local development and demo purposes.
--           DO NOT use this in production.
-- Password hash: scrypt(salt=random_16_bytes, password=testpass123) → 64-byte key
-- ============================================================================
-- The hash below is pre-computed so you don't need to register.
-- It was generated with:  crypto.scrypt('testpass123', randomSalt, 64)
-- Replace the hex string below with output from your own setup if needed.
INSERT INTO users (id, username, password_hash, created_at, ai_provider, ai_api_key, ai_model)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'testuser',
  -- Pre-computed scrypt hash for 'testpass123'
  -- Salt:     00000000000000000000000000000000 (16 zero bytes)
  -- Key hash: 2e61a4b9b6bc6800d4f3a74790f561d239578210e8eb47a7ba078bd4dc48823240fe0ae234a5513434c2af819b944efcbeba37b390a57c3666a7a04ea78f335a
  '00000000000000000000000000000000:2e61a4b9b6bc6800d4f3a74790f561d239578210e8eb47a7ba078bd4dc48823240fe0ae234a5513434c2af819b944efcbeba37b390a57c3666a7a04ea78f335a',
  NOW(),
  'gemini',
  '',
  'gemini-2.5-flash'
)
ON DUPLICATE KEY UPDATE id = id;  -- Safe: skips if user already exists

-- ============================================================================
-- VERIFICATION QUERIES (run these in phpMyAdmin to confirm setup)
-- ============================================================================

-- Check tables were created
-- SELECT table_name, engine, table_collation FROM information_schema.tables
--   WHERE table_schema = 'sentinel';

-- Check default user exists
-- SELECT id, username, LEFT(password_hash, 20) AS password_hash_prefix, ai_provider, ai_model
--   FROM users WHERE username = 'testuser';

-- Test login simulation (replace password hash with your actual hash):
-- SELECT username, password_hash FROM users WHERE username = 'testuser';
