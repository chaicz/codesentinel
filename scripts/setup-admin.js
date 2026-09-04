/**
 * Script to set up admin user in the database
 * Run: node scripts/setup-admin.js
 */

import crypto from 'crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const SCRYPT_KEYLEN = 32;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sentinel',
  });

  const adminPassword = 'admin123';
  const passwordHash = await hashPassword(adminPassword);
  
  console.log('Password hash for "admin123":');
  console.log(passwordHash);
  console.log();

  const adminId = 'admin-001';
  const username = 'admin';
  const email = 'admin@codesentinel.local';

  // Insert or update admin user
  await connection.execute(`
    INSERT INTO users (id, username, email, password_hash, role, is_active, ai_provider, ai_model)
    VALUES (?, ?, ?, ?, 'admin', TRUE, 'gemini', 'gemini-2.0-flash')
    ON DUPLICATE KEY UPDATE 
      password_hash = VALUES(password_hash),
      role = 'admin',
      is_active = TRUE
  `, [adminId, username, email, passwordHash]);

  console.log(`Admin user "${username}" has been set up in the database.`);
  console.log('Credentials:');
  console.log('  Username: admin');
  console.log('  Password: admin123');

  await connection.end();
}

main().catch(console.error);
