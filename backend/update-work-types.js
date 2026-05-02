const db = require('./db');

// Docx only: Kashif (cp16), Farhan (cp17), Musab (cp12), Riyan Kazim (cp13)
const docxOnly = ['cp12', 'cp13', 'cp16', 'cp17'];

// All other college project IDs
const projectAndDocx = ['cp1', 'cp2', 'cp3', 'cp4', 'cp5', 'cp6', 'cp7', 'cp8', 'cp9', 'cp10', 'cp11', 'cp14', 'cp15'];

const updateWorkTypes = async () => {
  try {
    await db.initDB();
    const pool = db.pool;

    console.log("Updating Docx Only projects...");
    await pool.query(
      `UPDATE projects SET notes = 'Docx only' WHERE id IN (${docxOnly.map(() => '?').join(',')})`,
      docxOnly
    );

    console.log("Updating Project + Docx projects...");
    await pool.query(
      `UPDATE projects SET notes = 'Project + Docx' WHERE id IN (${projectAndDocx.map(() => '?').join(',')})`,
      projectAndDocx
    );

    console.log("\n✅ Work types seeded:");
    console.log("  Docx only   → Musab, Riyan Kazim, Kashif, Farhan");
    console.log("  Project+Docx → All others");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

updateWorkTypes();
