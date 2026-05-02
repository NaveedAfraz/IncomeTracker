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
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        client VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        period VARCHAR(100),
        totalAmount DECIMAL(10, 2) NOT NULL,
        receivedAmount DECIMAL(10, 2) DEFAULT 0,
        pendingAmount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
