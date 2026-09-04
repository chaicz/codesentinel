/**
 * SENTINEL IDE - Fix Admin User Script
 * 
 * Run this to completely reset the admin account:
 * 
 *   node fix-admin.mjs
 * 
 * Requirements:
 *   1. XAMPP MySQL must be running
 *   2. Database 'sentinel' must exist (run setup.sql if needed)
 */

import crypto from 'crypto';
import mysql from 'mysql2/promise';

const SCRYPT_KEYLEN = 64;
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

async function main() {
  console.log('='.repeat(60));
  console.log('SENTINEL IDE - Admin User Fix Script');
  console.log('='.repeat(60));
  console.log();

  // MySQL connection config (matches .env defaults)
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    // Step 1: Create database and use it
    console.log('Creating database...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS sentinel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE sentinel`);
    console.log('✓ Database ready');

    // Step 2: Create tables if they don't exist
    console.log('Creating tables...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
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
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Tables ready');

    // Step 3: Delete existing admin user (if any)
    console.log('Removing existing admin user...');
    await connection.query(`DELETE FROM users WHERE username = ?`, [ADMIN_USERNAME]);
    console.log('✓ Existing admin removed');

    // Step 4: Generate password hash
    console.log('Generating password hash...');
    const salt = crypto.randomBytes(16);
    const passwordHash = await new Promise((resolve, reject) => {
      crypto.scrypt(ADMIN_PASSWORD, salt, SCRYPT_KEYLEN, (err, key) => {
        if (err) reject(err);
        else resolve(salt.toString('hex') + ':' + key.toString('hex'));
      });
    });
    console.log(`✓ Hash generated: ${passwordHash.substring(0, 20)}...`);

    // Step 5: Insert new admin user
    console.log('Creating admin user...');
    const adminId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO users (id, username, email, password_hash, role, is_active, ai_provider, ai_model)
       VALUES (?, ?, ?, ?, 'admin', TRUE, 'gemini', 'gemini-2.0-flash')`,
      [adminId, ADMIN_USERNAME, 'admin@example.com', passwordHash]
    );
    console.log('✓ Admin user created');

    // Step 6: Verify
    const [rows] = await connection.query(
      `SELECT id, username, email, role, is_active, LEFT(password_hash, 20) as hash_prefix FROM users WHERE username = ?`,
      [ADMIN_USERNAME]
    );

    console.log();
    console.log('='.repeat(60));
    console.log('SUCCESS! Admin account created.');
    console.log('='.repeat(60));
    console.log();
    console.log('Credentials:');
    console.log(`  Username: ${ADMIN_USERNAME}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log();
    console.log('You can now log in at http://localhost:3000');
    console.log();

    if (rows[0]) {
      console.log('Database record:');
      console.log(`  ID: ${rows[0].id}`);
      console.log(`  Role: ${rows[0].role}`);
      console.log(`  Active: ${rows[0].is_active ? 'Yes' : 'No'}`);
    }

  } catch (err) {
    console.error('ERROR:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('Make sure XAMPP MySQL is running!');
    }
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
