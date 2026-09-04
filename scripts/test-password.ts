/**
 * Test password verification
 * Run with: npx tsx scripts/test-password.ts
 */

import crypto from 'crypto';

const SCRYPT_KEYLEN = 64;

// Test password
const testPassword = 'admin123';

// The hash from the database (admin user)
const storedHash = '20ef1ba2befbd590dce530346581c2d0:c282908ae37c1b7c5eb2ce00c0b93359ceb69abfe8153b5bbe150a29a955e199';

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  
  console.log('Salt hex:', saltHex, '(length:', saltHex.length, ')');
  console.log('Salt buffer length:', salt.length, 'bytes');
  console.log('Hash hex:', hashHex.substring(0, 20) + '...', '(length:', hashHex.length, ')');
  console.log('Hash buffer length:', expected.length, 'bytes');
  console.log('Expected SCRYPT_KEYLEN:', SCRYPT_KEYLEN);
  
  if (expected.length !== SCRYPT_KEYLEN) {
    console.log('ERROR: Hash length mismatch!');
    return false;
  }
  if (salt.length !== 16) {
    console.log('ERROR: Salt length mismatch!');
    return false;
  }

  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  
  console.log('Derived hash:', derived.toString('hex').substring(0, 20) + '...');
  console.log('Match:', derived.toString('hex') === expected.toString('hex'));
  
  return crypto.timingSafeEqual(expected, derived);
}

async function main() {
  console.log('Testing password verification');
  console.log('Test password:', testPassword);
  console.log('Stored hash:', storedHash);
  console.log('');
  
  const result = await verifyPassword(testPassword, storedHash);
  console.log('\nFinal result:', result ? 'SUCCESS ✓' : 'FAILED ✗');
}

main().catch(console.error);
