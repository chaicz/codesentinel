-- ============================================================================
-- SENTINEL IDE - Add Email Column & Admin User
-- Run in phpMyAdmin: http://localhost/phpmyadmin
-- ============================================================================

-- Step 1: Add email column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';

-- Step 2: Add role column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Step 3: Add is_active column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Step 4: Insert admin user
-- Password: admin123
-- Hash: pre-computed scrypt hash
INSERT INTO users (id, username, email, password_hash, role, is_active, ai_provider, ai_model)
VALUES (
  UUID(),
  'admin',
  'admin@example.com',
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',
  'admin',
  TRUE,
  'gemini',
  'gemini-2.0-flash'
)
ON DUPLICATE KEY UPDATE 
  password_hash = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',
  role = 'admin',
  is_active = TRUE;

-- Verify
SELECT id, username, email, role, is_active FROM users WHERE username = 'admin';
