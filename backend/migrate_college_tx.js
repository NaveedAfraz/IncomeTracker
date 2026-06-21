/**
 * Splits the ₹21,100 aggregated college payment (Mar 10, 2026)
 * into realistic individual payments spread Feb → May 2026,
 * weighted heavily toward April-May.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });

  // 1. Find the aggregated transaction
  const [txRows] = await conn.query(
    'SELECT t.id, t.projectId, t.amount FROM transactions t ' +
    "JOIN projects p ON t.projectId = p.id " +
    "WHERE t.amount = 21100 AND t.notes LIKE '%Aggregated%'"
  );

  if (txRows.length === 0) {
    console.log('Aggregated transaction not found. Already migrated?');
    await conn.end();
    return;
  }

  const { id: oldTxId, projectId } = txRows[0];
  console.log(`Found aggregated tx: ${oldTxId} on project ${projectId}`);

  // 2. Distribution plan — total must equal 21,100
  // Heavy on Apr-May as requested
  const splits = [
    { date: '2026-02-18', amount: 3500, notes: 'College payments — February batch (early payers)' },
    { date: '2026-03-12', amount: 3600, notes: 'College payments — March batch' },
    { date: '2026-04-08', amount: 9000, notes: 'College payments — April batch (bulk receipts)' },
    { date: '2026-05-03', amount: 5000, notes: 'College payments — May batch (final group)' },
  ];

  const total = splits.reduce((s, r) => s + r.amount, 0);
  console.log(`Split total: ₹${total} (original: ₹21100) — ${total === 21100 ? 'OK ✓' : 'MISMATCH ✗'}`);

  // 3. Delete the old aggregated transaction
  await conn.query('DELETE FROM transactions WHERE id = ?', [oldTxId]);
  console.log(`Deleted old aggregated transaction ${oldTxId}`);

  // 4. Insert the split transactions
  const { v4: uuidv4 } = require('uuid');
  for (const split of splits) {
    const newId = uuidv4();
    await conn.query(
      'INSERT INTO transactions (id, projectId, amount, type, date, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [newId, projectId, split.amount, 'Paid', split.date, split.notes]
    );
    console.log(`  + Inserted: ${split.date}  ₹${split.amount}  [${split.notes}]`);
  }

  console.log('\nDone! College transactions now distributed Feb–May 2026.');
  await conn.end();
})();
