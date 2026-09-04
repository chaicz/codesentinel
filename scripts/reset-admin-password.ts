/**
 * Script to reset admin password in the database
 * Run with: npx tsx scripts/reset-admin-password.ts
 */

import crypto from 'crypto';
import mysql from 'mysql2/promise';

const SCRYPT_KEYLEN = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt.toString('hex')}:${key.toString('hex')}`);
    });
  });
}

async function main() {
  // Connect to database
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sentinel',
  });

  const newPassword = 'admin123'; // You can change this
  const hashedPassword = await hashPassword(newPassword);

  console.log('New password:', newPassword);
  console.log('Hash:', hashedPassword);

  // Update admin user
  const [result] = await connection.execute(
    'UPDATE users SET password_hash = ? WHERE username = ?',
    [hashedPassword, 'admin']
  );

  console.log('Update result:', result);

  // Verify
  const [rows] = await connection.execute(
    'SELECT id, username, password_hash, role FROM users WHERE username = ?',
    ['admin']
  );

  console.log('Admin user after update:', rows);

  await connection.end();
  console.log('\nDone! You can now login with:');
  console.log('  Username: admin');
  console.log('  Password:', newPassword);
}

main().catch(console.error);
