/**
 * migrate_user.js
 * Creates naveedafraz2003@gmail.com and reassigns all existing projects to them.
 * Run once: node migrate_user.js
 */
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME.trim(),
    ssl: { rejectUnauthorized: false },
  });

  const email = 'naveedafraz2003@gmail.com';
  const name  = 'Naveed Afraz';
  const pass  = 'naveed2003';

  // 1. Ensure users table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Create or find the user
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  let userId;
  if (existing.length > 0) {
    userId = existing[0].id;
    // Update the password just in case
    const hash = await bcrypt.hash(pass, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    console.log(`User already exists (id: ${userId}) — password updated.`);
  } else {
    userId = uuidv4();
    const hash = await bcrypt.hash(pass, 12);
    await pool.query(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [userId, name, email, hash]
    );
    console.log(`✅ Created user: ${email} (id: ${userId})`);
  }

  // 3. Add userId column to projects if it doesn't exist yet
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'userId'"
  );
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE projects ADD COLUMN userId VARCHAR(36) NOT NULL DEFAULT '${userId}' AFTER id`);
    console.log('✅ Added userId column to projects');
  }

  // 4. Reassign ALL existing rows (regardless of current userId value) to this user
  const [result] = await pool.query('UPDATE projects SET userId = ?', [userId]);
  console.log(`✅ Reassigned ${result.affectedRows} project(s) to ${email}`);

  console.log('\nDone! Log in with:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${pass}`);

  await pool.end();
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
