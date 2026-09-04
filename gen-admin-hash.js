const crypto = require('crypto');
const password = 'admin123'; // Change this password as needed
const salt = crypto.randomBytes(16);

crypto.scrypt(password, salt, 64, (err, derived) => {
  if (err) throw err;
  const hash = salt.toString('hex') + ':' + derived.toString('hex');
  console.log('Generated password hash for:', password);
  console.log('Hash:', hash);
  console.log();
  console.log('-- SQL to insert/update admin user in MySQL:');
  console.log(`INSERT INTO users (id, username, email, password_hash, role, is_active, ai_provider, ai_model)
VALUES (UUID(), 'admin', 'admin@example.com', '${hash}', 'admin', TRUE, 'gemini', 'gemini-2.5-flash')
ON DUPLICATE KEY UPDATE password_hash='${hash}', role='admin', is_active=TRUE;`);
});
