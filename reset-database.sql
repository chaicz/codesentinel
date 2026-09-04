-- ============================================================================
-- SENTINEL IDE - COMPLETE DATABASE RESET
-- WARNING: This will DELETE ALL DATA and recreate the database
-- Run in phpMyAdmin: http://localhost/phpmyadmin
-- ============================================================================

-- Step 1: Drop and recreate the database
DROP DATABASE IF EXISTS sentinel;
CREATE DATABASE sentinel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sentinel;

-- Step 2: Create users table with correct schema
CREATE TABLE users (
  id             VARCHAR(36)  PRIMARY KEY,
  username       VARCHAR(32)  NOT NULL UNIQUE,
  email          VARCHAR(255) DEFAULT '',
  password_hash  VARCHAR(192) NOT NULL,
  role           VARCHAR(20)  DEFAULT 'user',
  is_active      BOOLEAN      DEFAULT TRUE,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login     DATETIME     DEFAULT NULL,
  ai_provider    VARCHAR(20)  DEFAULT 'gemini',
  ai_api_key     VARCHAR(255) DEFAULT '',
  ai_model       VARCHAR(64)  DEFAULT 'gemini-2.0-flash',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_last_login (last_login),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 3: Create sessions table
CREATE TABLE sessions (
  session_id  VARCHAR(64)  PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  expires_at  BIGINT       NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Step 4: Insert admin user with properly computed scrypt hash
-- Admin Password: admin123
-- scrypt(password='admin123', salt=16_random_bytes, N=2^14, r=8, p=1, keylen=64)
-- Run this in Node.js to get a valid hash:
--   const crypto = require('crypto');
--   crypto.scrypt('admin123', crypto.randomBytes(16), 64, (e,k) => console.log(crypto.randomBytes(16).toString('hex') + ':' + k.toString('hex')))

-- Using a pre-computed hash (regenerate with setup-admin-generate.js)
-- Hash format: 32_hex_chars_salt:128_hex_chars_key

INSERT INTO users (id, username, email, password_hash, role, is_active, ai_provider, ai_model)
VALUES (
  UUID(),
  'admin',
  'admin@example.com',
  -- This is a placeholder - the server will hash 'admin123' correctly on startup
  -- To set the correct password, DELETE existing admin and restart the server:
  --   DELETE FROM users WHERE username = 'admin';
  -- Then run: npm run dev
  'REPLACE_WITH_VALID_HASH',
  'admin',
  TRUE,
  'gemini',
  'gemini-2.0-flash'
);

-- Verify tables created
SELECT 'Tables created successfully!' AS status;
SELECT COUNT(*) AS user_count FROM users;
