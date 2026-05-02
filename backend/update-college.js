const db = require('./db');

const newCollegeProjects = [
  { id: "cp1",  client: "Idress",        total: 2500, received: 2500, pending: 0,    status: "Completed" },
  { id: "cp2",  client: "Kabeer",        total: 4400, received: 4400, pending: 0,    status: "Completed" },
  { id: "cp3",  client: "Arbaaz",        total: 1400, received: 1400, pending: 0,    status: "Completed" },
  { id: "cp4",  client: "Riyan (Split)", total: 1400, received: 1300, pending: 100,  status: "Pending"   },
  { id: "cp5",  client: "Maaz",          total: 1850, received: 1850, pending: 0,    status: "Completed" },
  { id: "cp6",  client: "Sarvath",       total: 1000, received: 1000, pending: 0,    status: "Completed" },
  { id: "cp7",  client: "Saif",          total: 2000, received: 1000, pending: 1000, status: "Pending"   },
  { id: "cp8",  client: "Rayaan",        total: 3500, received: 3500, pending: 0,    status: "Completed" },
  { id: "cp9",  client: "Amaan Shareef", total: 1200, received: 900,  pending: 300,  status: "Pending"   },
  { id: "cp10", client: "Majid + Omer",  total: 2700, received: 1000, pending: 1700, status: "High Pending" },
  { id: "cp11", client: "Mujahed",       total: 1800, received: 1800, pending: 0,    status: "Completed" },
  { id: "cp12", client: "Musab",         total: 650,  received: 600,  pending: 50,   status: "Pending"   },
  { id: "cp13", client: "Riyan Kazim",   total: 650,  received: 650,  pending: 0,    status: "Completed" },
  { id: "cp14", client: "Faiz (Arwaaz)", total: 800,  received: 700,  pending: 100,  status: "Pending"   },
  { id: "cp15", client: "Samra",         total: 1500, received: 0,    pending: 1500, status: "High Pending" },
  { id: "cp16", client: "Kashif",        total: 400,  received: 300,  pending: 100,  status: "Pending"   },
  { id: "cp17", client: "Farhan",        total: 100,  received: 100,  pending: 0,    status: "Completed" },
];

const updateCollegeProjects = async () => {
  try {
    await db.initDB();
    const pool = db.pool;

    console.log("Deleting old college project transactions...");
    const oldIds = ["cp1","cp2","cp3","cp4","cp5","cp6","cp7","cp8","cp9","cp10","cp11","cp12","cp13","cp14"];
    if (oldIds.length > 0) {
      await pool.query(`DELETE FROM transactions WHERE projectId IN (${oldIds.map(() => '?').join(',')})`, oldIds);
      await pool.query(`DELETE FROM projects WHERE id IN (${oldIds.map(() => '?').join(',')})`, oldIds);
    }
    console.log("Old college projects removed.");

    console.log("Inserting updated college projects...");
    for (const p of newCollegeProjects) {
      await pool.query(
        `INSERT INTO projects (id, name, client, type, period, totalAmount, receivedAmount, pendingAmount, status, notes)
         VALUES (?, 'College Project', ?, 'College', 'Feb - May', ?, ?, ?, ?, '')
         ON DUPLICATE KEY UPDATE
           client=VALUES(client), totalAmount=VALUES(totalAmount),
           receivedAmount=VALUES(receivedAmount), pendingAmount=VALUES(pendingAmount),
           status=VALUES(status)`,
        [p.id, p.client, p.total, p.received, p.pending, p.status]
      );
    }

    // Keep aggregated transactions pointing to cp1 but update cp1's values
    // Insert one summary transaction for all college projects into cp1
    console.log("Inserting summary transaction for college projects...");
    await pool.query(
      `INSERT INTO transactions (id, projectId, amount, type, date, notes)
       VALUES (?, 'cp1', ?, 'Paid', '2025-05-20', 'Aggregated college payments')
       ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
      ['t14', 21100]
    );
    await pool.query(
      `INSERT INTO transactions (id, projectId, amount, type, date, notes)
       VALUES (?, 'cp1', ?, 'Due', '2025-05-25', 'Aggregated college dues')
       ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
      ['t15', 4850]
    );

    console.log("\n✅ College projects updated successfully!");
    console.log("  Total: ₹25,950 | Paid: ₹21,100 | Due: ₹4,850");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

updateCollegeProjects();
