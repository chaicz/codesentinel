/**
 * Sentinel IDE - Generate Admin User SQL
 * 
 * Run this script to generate a valid admin user SQL statement:
 * 
 *   node setup-admin-generate.js
 * 
 * Copy the SQL output and run it in phpMyAdmin or MySQL CLI.
 */

const crypto = require('crypto');

const ADMIN_PASSWORD = 'admin123';
const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@example.com';

// Generate scrypt hash
const salt = crypto.randomBytes(16);
const SCRYPT_KEYLEN = 64;

crypto.scrypt(ADMIN_PASSWORD, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }

  const hash = salt.toString('hex') + ':' + derivedKey.toString('hex');
  
  console.log('='.repeat(70));
  console.log('SENTINEL IDE - Admin User SQL Generator');
  console.log('='.repeat(70));
  console.log();
  console.log(`Username: ${ADMIN_USERNAME}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
  console.log(`Email:    ${ADMIN_EMAIL}`);
  console.log();
  console.log('Generated Hash:');
  console.log(hash);
  console.log();
  console.log('='.repeat(70));
  console.log('SQL Statement (run this in phpMyAdmin or MySQL CLI):');
  console.log('='.repeat(70));
  console.log();
  console.log(`-- Admin user for Sentinel IDE`);
  console.log(`-- Password: ${ADMIN_PASSWORD}`);
  console.log();
  console.log(`USE sentinel;`);
  console.log();
  console.log(`INSERT INTO users (id, username, email, password_hash, role, ai_provider, ai_model)`);
  console.log(`VALUES (`);
  console.log(`  UUID(),`);
  console.log(`  '${ADMIN_USERNAME}',`);
  console.log(`  '${ADMIN_EMAIL}',`);
  console.log(`  '${hash}',`);
  console.log(`  'admin',`);
  console.log(`  'gemini',`);
  console.log(`  'gemini-2.0-flash'`);
  console.log(`)`);
  console.log(`ON DUPLICATE KEY UPDATE`);
  console.log(`  password_hash = '${hash}',`);
  console.log(`  role = 'admin';`);
  console.log();
  console.log('='.repeat(70));
  console.log('Verification Query (run after inserting):');
  console.log('='.repeat(70));
  console.log(`SELECT id, username, email, role FROM users WHERE username = '${ADMIN_USERNAME}';`);
});
