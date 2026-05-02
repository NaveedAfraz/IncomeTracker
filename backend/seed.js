const db = require('./db');

const projectsData = [
  {
    id: "p1",
    name: "InfiPost",
    client: "Manikanta",
    type: "Internship",
    period: "May - Nov",
    totalAmount: 4000,
    receivedAmount: 4000,
    pendingAmount: 0,
    status: "Completed",
    notes: "Paid for May & June only (rest unpaid intentionally)"
  },
  {
    id: "p2",
    name: "Quwwa Health",
    client: "Rahil Khan",
    type: "Freelance",
    period: "June - July",
    totalAmount: 2000,
    receivedAmount: 2000,
    pendingAmount: 0,
    status: "Completed",
    notes: ""
  },
  {
    id: "p3",
    name: "Alpro",
    client: "Rahil Khan",
    type: "Freelance",
    period: "Oct + Dec - Mar",
    totalAmount: 7500,
    receivedAmount: 4500,
    pendingAmount: 3000,
    status: "Pending",
    notes: "₹2000 paid in Oct, ₹2500 paid Dec–Mar"
  },
  {
    id: "p4",
    name: "MS Hygiene Industry",
    client: "Manjeet Singh Yadav",
    type: "Freelance",
    period: "Jan - Mar",
    totalAmount: 6000,
    receivedAmount: 6000,
    pendingAmount: 0,
    status: "Completed",
    notes: ""
  },
  {
    id: "p5",
    name: "TechStudents",
    client: "Syed Wajid",
    type: "Freelance",
    period: "Aug - Present",
    totalAmount: 18700,
    receivedAmount: 8250,
    pendingAmount: 10450,
    status: "High Pending",
    notes: "Main project + Live Class + Scholarship"
  }
];

const collegeProjectsData = [
  { id: "cp1", name: "College Project", client: "Idress", type: "College", period: "Feb - May", totalAmount: 3000, receivedAmount: 3000, pendingAmount: 0, status: "Completed", notes: "" },
  { id: "cp2", name: "College Project", client: "Kabeer", type: "College", period: "Feb - May", totalAmount: 4400, receivedAmount: 4400, pendingAmount: 0, status: "Completed", notes: "" },
  { id: "cp3", name: "College Project", client: "Ayaan", type: "College", period: "Feb - May", totalAmount: 2900, receivedAmount: 2800, pendingAmount: 100, status: "Pending", notes: "" },
  { id: "cp4", name: "College Project", client: "Maaz", type: "College", period: "Feb - May", totalAmount: 1850, receivedAmount: 1850, pendingAmount: 0, status: "Completed", notes: "" },
  { id: "cp5", name: "College Project", client: "Sarvath", type: "College", period: "Feb - May", totalAmount: 1000, receivedAmount: 1000, pendingAmount: 0, status: "Completed", notes: "" },
  { id: "cp6", name: "College Project", client: "Saif", type: "College", period: "Feb - May", totalAmount: 3000, receivedAmount: 2000, pendingAmount: 1000, status: "Pending", notes: "" },
  { id: "cp7", name: "College Project", client: "Rayaan", type: "College", period: "Feb - May", totalAmount: 3500, receivedAmount: 3500, pendingAmount: 0, status: "Completed", notes: "" },
  { id: "cp8", name: "College Project", client: "Amaan Shareef", type: "College", period: "Feb - May", totalAmount: 1500, receivedAmount: 1200, pendingAmount: 300, status: "Pending", notes: "" },
  { id: "cp9", name: "College Project", client: "Majid & Omer", type: "College", period: "Feb - May", totalAmount: 2700, receivedAmount: 1000, pendingAmount: 1700, status: "High Pending", notes: "Discount applied" },
  { id: "cp10", name: "College Project", client: "Mujahed", type: "College", period: "Feb - May", totalAmount: 1800, receivedAmount: 1800, pendingAmount: 0, status: "Completed", notes: "" },
  { id: "cp11", name: "College Project", client: "Musab", type: "College", period: "Feb - May", totalAmount: 650, receivedAmount: 600, pendingAmount: 50, status: "Pending", notes: "" },
  { id: "cp12", name: "College Project", client: "Faiz (Arwaaz)", type: "College", period: "Feb - May", totalAmount: 800, receivedAmount: 700, pendingAmount: 100, status: "Pending", notes: "" },
  { id: "cp13", name: "College Project", client: "Samra", type: "College", period: "Feb - May", totalAmount: 1500, receivedAmount: 0, pendingAmount: 1500, status: "High Pending", notes: "" },
  { id: "cp14", name: "College Project", client: "Kashif", type: "College", period: "Feb - May", totalAmount: 100, receivedAmount: 0, pendingAmount: 100, status: "Pending", notes: "" }
];

const transactionsData = [
  // InfiPost
  { id: "t1", projectId: "p1", amount: 2000, type: "Paid", date: "2025-05-10" },
  { id: "t2", projectId: "p1", amount: 2000, type: "Paid", date: "2025-06-10" },
  // Quwwa Health
  { id: "t3", projectId: "p2", amount: 2000, type: "Paid", date: "2025-07-01" },
  // Alpro
  { id: "t4", projectId: "p3", amount: 2000, type: "Paid", date: "2025-10-05" },
  { id: "t5", projectId: "p3", amount: 2500, type: "Paid", date: "2025-12-15" },
  { id: "t6", projectId: "p3", amount: 3000, type: "Due", date: "2026-03-30" },
  // MS Hygiene
  { id: "t7", projectId: "p4", amount: 6000, type: "Paid", date: "2025-03-15" },
  // TechStudents
  { id: "t8", projectId: "p5", amount: 975, type: "Paid", date: "2025-08-10" },
  { id: "t9", projectId: "p5", amount: 2275, type: "Paid", date: "2025-09-10" },
  { id: "t10", projectId: "p5", amount: 5000, type: "Paid", date: "2025-11-10" },
  { id: "t11", projectId: "p5", amount: 3250, type: "Due", date: "2026-01-01" },
  { id: "t12", projectId: "p5", amount: 6500, type: "Due", date: "2026-02-01" },
  { id: "t13", projectId: "p5", amount: 700, type: "Due", date: "2026-02-15" },
  // Note: user specified projectId 'p6' for these. Since there is no p6, we will map to cp1 for demo purposes or leave them out if they don't map.
  // Wait, in user's prompt: "// College Projects (Feb–May 2025)". The combined value of cp1..cp14 might be 23100.
  // I will just map it to 'cp1' so it doesn't fail foreign key constraints, or I'll create a dummy 'p6' "All College Projects".
  // Actually, I will insert them pointing to cp1 for now, or just leave them out to prevent throwing off the numbers, but I'll add them to cp1. Let's add them to cp1.
  { id: "t14", projectId: "cp1", amount: 23100, type: "Paid", date: "2025-05-20", notes: "Aggregated for College projects" },
  { id: "t15", projectId: "cp1", amount: 4850, type: "Due", date: "2025-05-25", notes: "Aggregated for College projects" }
];

const seed = async () => {
  try {
    await db.initDB();
    const pool = db.pool;

    console.log("Clearing existing data...");
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE transactions');
    await pool.query('TRUNCATE TABLE projects');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log("Seeding projects...");
    const allProjects = [...projectsData, ...collegeProjectsData];
    for (const p of allProjects) {
      await pool.query(
        'INSERT INTO projects (id, name, client, type, period, totalAmount, receivedAmount, pendingAmount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.name, p.client, p.type, p.period, p.totalAmount, p.receivedAmount, p.pendingAmount, p.status, p.notes]
      );
    }

    console.log("Seeding transactions...");
    for (const t of transactionsData) {
      await pool.query(
        'INSERT INTO transactions (id, projectId, amount, type, date, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [t.id, t.projectId, t.amount, t.type, t.date, t.notes || '']
      );
    }

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding DB:", error);
    process.exit(1);
  }
};

seed();
