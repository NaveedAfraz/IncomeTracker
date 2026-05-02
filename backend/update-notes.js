const db = require('./db');

const updateNotes = async () => {
  try {
    await db.initDB();
    const pool = db.pool;

    await pool.query('UPDATE transactions SET notes = ? WHERE id = ?', ['Final delivery', 't11']);
    await pool.query('UPDATE transactions SET notes = ? WHERE id = ?', ['Live class module', 't12']);
    await pool.query('UPDATE transactions SET notes = ? WHERE id = ?', ['Scholarships module', 't13']);

    console.log("Transaction notes updated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error updating DB:", error);
    process.exit(1);
  }
};

updateNotes();
