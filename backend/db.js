const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const initDB = async () => {
  try {
    // 1. Create a connection without a database to create the database if it doesn't exist
    const initialConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    const dbName = process.env.DB_NAME.trim();
    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' created or already exists.`);
    await initialConnection.end();

    // 2. Initialize the connection pool with the database
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: { rejectUnauthorized: false }
    });

    const connection = await pool.getConnection();
    console.log('Connected to MySQL DB pool');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        client VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        period VARCHAR(100),
        startDate DATE NULL,
        endDate DATE NULL,
        totalAmount DECIMAL(10, 2) NOT NULL,
        receivedAmount DECIMAL(10, 2) DEFAULT 0,
        pendingAmount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Add userId column to existing projects table if it doesn't exist
    const [projectCols] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'userId'"
    );
    if (projectCols.length === 0) {
      // First create a default system user if needed for existing data
      const systemUserId = '00000000-0000-0000-0000-000000000001';
      const [existingSystem] = await connection.query('SELECT id FROM users WHERE id = ?', [systemUserId]);
      if (existingSystem.length === 0) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('changeme123', 10);
        await connection.query(
          'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
          [systemUserId, 'Admin', 'admin@nexustrack.app', hash]
        );
        console.log('Created default admin user (admin@nexustrack.app / changeme123)');
      }
      await connection.query("ALTER TABLE projects ADD COLUMN userId VARCHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' AFTER id");
      console.log('Added userId column to projects');
    }

    // Add startDate/endDate columns to existing tables if they don't exist
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects'
      AND COLUMN_NAME IN ('startDate', 'endDate')
    `);
    const existingCols = cols.map(c => c.COLUMN_NAME);
    if (!existingCols.includes('startDate')) {
      await connection.query('ALTER TABLE projects ADD COLUMN startDate DATE NULL AFTER period');
      console.log('Added startDate column');
    }
    if (!existingCols.includes('endDate')) {
      await connection.query('ALTER TABLE projects ADD COLUMN endDate DATE NULL AFTER startDate');
      console.log('Added endDate column');
    }

    // Backfill startDate/endDate from existing period text for rows that still have NULL dates
    const MONTHS = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04',
      jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    const parseMonthYear = (str, fallbackYear) => {
      if (!str) return null;
      const trimmed = str.trim();
      // Try "Month YYYY" first
      const withYear = trimmed.match(/^([a-z]+)\s+(\d{4})$/i);
      if (withYear) {
        const month = MONTHS[withYear[1].toLowerCase()];
        return month ? `${withYear[2]}-${month}-01` : null;
      }
      // Try "Month" alone → use fallbackYear
      const monthOnly = trimmed.match(/^([a-z]+)$/i);
      if (monthOnly && fallbackYear) {
        const month = MONTHS[monthOnly[1].toLowerCase()];
        return month ? `${fallbackYear}-${month}-01` : null;
      }
      return null;
    };

    const fmtDate = (d) => {
      const dt = new Date(d);
      return dt.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    };
    const buildPeriodStr = (start, end) =>
      end ? `${fmtDate(start)} - ${fmtDate(end)}` : `${fmtDate(start)} - ongoing`;

    // --- Targeted manual backfill for known projects (user-confirmed dates) ---
    const manualFills = [
      // College Projects: Feb - May 2026
      {
        where: `type = 'College' AND period = 'Feb - May'`,
        start: '2026-02-01', end: '2026-05-01'
      },
      // p1 InfiPost: May - Nov 2025
      { where: `id = 'p1'`, start: '2025-05-01', end: '2025-11-01' },
      // p2 Quwwa Health (old, not mobile): June - July 2025
      { where: `id = 'p2'`, start: '2025-06-01', end: '2025-07-01' },
      // p3 Alpro: Oct 2025 - Mar 2026
      { where: `id = 'p3'`, start: '2025-10-01', end: '2026-03-01' },
      // p4 MS Hygiene Industry: Jan - Mar 2026
      { where: `id = 'p4'`, start: '2026-01-01', end: '2026-03-01' },
      // p5 TechStudents: Aug 2025 - ongoing
      { where: `id = 'p5'`, start: '2025-08-01', end: null },
    ];

    for (const fill of manualFills) {
      const period = buildPeriodStr(fill.start, fill.end);
      await connection.query(
        `UPDATE projects SET startDate = ?, endDate = ?, period = ? WHERE ${fill.where}`,
        [fill.start, fill.end, period]
      );
      console.log(`Manual backfill: [${fill.where}] → ${fill.start} → ${fill.end || 'ongoing'}`);
    }

    // --- Set status = 'Ongoing' for confirmed ongoing projects ---
    const ongoingIds = [
      'f5c76b1c-42f7-4b5e-8377-c9de69e9da66', // Quwwa health (mobile app)
      '1a2a70da-cdfb-41da-93bc-a30fe7e95c14',  // 1 plugin + klipp website
      'p5',                                      // TechStudents
    ];
    for (const id of ongoingIds) {
      await connection.query(`UPDATE projects SET status = 'Ongoing' WHERE id = ?`, [id]);
    }
    console.log('Set Ongoing status for confirmed ongoing projects');

    // --- Auto backfill remaining NULLs using period text + created_at year as fallback ---
    const [rowsToFill] = await connection.query(
      `SELECT id, period, created_at FROM projects WHERE startDate IS NULL AND period IS NOT NULL AND period != ''`
    );

    for (const row of rowsToFill) {
      const period = row.period.trim();
      const fallbackYear = row.created_at ? new Date(row.created_at).getFullYear() : null;

      // Split on " - " to get start and end parts (take only first " - " occurrence)
      const dashIdx = period.indexOf(' - ');
      if (dashIdx === -1) continue;

      const startStr = period.substring(0, dashIdx).trim();
      const endStr = period.substring(dashIdx + 3).trim();

      const startDate = parseMonthYear(startStr, fallbackYear);
      const isOngoing = /^(ongoing|present|now|current)$/i.test(endStr);
      const endDate = isOngoing ? null : parseMonthYear(endStr, fallbackYear);

      if (startDate) {
        const newPeriod = buildPeriodStr(startDate, endDate);
        await connection.query(
          'UPDATE projects SET startDate = ?, endDate = ?, period = ? WHERE id = ?',
          [startDate, endDate, newPeriod, row.id]
        );
        console.log(`Auto backfilled: ${row.id} → ${startDate} → ${endDate || 'ongoing'}`);
      }
    }
    if (rowsToFill.length > 0) {
      console.log(`Auto backfilled ${rowsToFill.length} remaining project(s)`);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(36) PRIMARY KEY,
        projectId VARCHAR(36) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    connection.release();
    console.log('Tables initialized');
  } catch (err) {
    console.error('Error initializing DB', err);
  }
};

module.exports = {
  get pool() {
    return pool;
  },
  initDB 
};
