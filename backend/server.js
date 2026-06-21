const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    // In production, FRONTEND_URL should be set. If not, we allow all for convenience
    // but reflect the origin to satisfy the 'credentials: true' requirement.
    if (!origin || origin === 'null') return callback(null, true);
    
    const allowedOrigins = [process.env.FRONTEND_URL ,'https://incometracker-uu7p.onrender.com'].filter(Boolean);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Fallback: allow the origin but properly set headers
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

const calculateStatus = (pending, total, override = null) => {
  let status = override;
  if (status === 'Completed' && pending > 0) {
    status = null;
  }
  if (status && ['Ongoing', 'Completed', 'Pending', 'High Pending', 'Failed'].includes(status)) return status;
  if (total === 0) return 'Ongoing';
  if (pending <= 0) return 'Completed';
  if (pending > total * 0.5) return 'High Pending';
  return 'Pending';
};

// Build human-readable period string from real dates
const buildPeriod = (startDate, endDate) => {
  if (!startDate) return '';
  const fmtDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };
  const start = fmtDate(startDate);
  const end = endDate ? fmtDate(endDate) : 'ongoing';
  return `${start} - ${end}`;
};

// Projects API
app.get('/api/projects', async (req, res) => {
  try {
    const [projects] = await db.pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    const [transactions] = await db.pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
    
    const projectsWithTx = projects.map(p => ({
      ...p,
      totalAmount: parseFloat(p.totalAmount),
      receivedAmount: parseFloat(p.receivedAmount),
      pendingAmount: parseFloat(p.pendingAmount),
      transactions: transactions.filter(t => t.projectId === p.id).map(t => ({
        ...t,
        amount: parseFloat(t.amount)
      }))
    }));

    res.json(projectsWithTx);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, client, type, startDate, endDate, totalAmount, receivedAmount, notes, statusOverride } = req.body;
    const id = uuidv4();
    const pendingAmount = totalAmount - receivedAmount;
    const status = calculateStatus(pendingAmount, totalAmount, statusOverride);
    const period = buildPeriod(startDate, endDate || null);

    await db.pool.query(
      'INSERT INTO projects (id, name, client, type, period, startDate, endDate, totalAmount, receivedAmount, pendingAmount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, client, type, period, startDate || null, endDate || null, totalAmount, receivedAmount, pendingAmount, status, notes]
    );

    res.status(201).json({ id, name, client, type, period, startDate: startDate || null, endDate: endDate || null, totalAmount, receivedAmount, pendingAmount, status, notes, transactions: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, client, type, startDate, endDate, totalAmount, receivedAmount, notes, statusOverride } = req.body;
    
    const pendingAmount = totalAmount - receivedAmount;
    const status = calculateStatus(pendingAmount, totalAmount, statusOverride);
    const period = buildPeriod(startDate, endDate || null);

    await db.pool.query(
      'UPDATE projects SET name = ?, client = ?, type = ?, period = ?, startDate = ?, endDate = ?, totalAmount = ?, receivedAmount = ?, pendingAmount = ?, status = ?, notes = ? WHERE id = ?',
      [name, client, type, period, startDate || null, endDate || null, totalAmount, receivedAmount, pendingAmount, status, notes, id]
    );

    res.json({ id, name, client, type, period, startDate: startDate || null, endDate: endDate || null, totalAmount, receivedAmount, pendingAmount, status, notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.pool.query('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Transactions API
app.post('/api/transactions', async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const { projectId, amount, type, date, notes } = req.body;
    const id = uuidv4();

    await connection.query(
      'INSERT INTO transactions (id, projectId, amount, type, date, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, projectId, amount, type, date, notes]
    );

    const [projects] = await connection.query('SELECT totalAmount, receivedAmount, status FROM projects WHERE id = ?', [projectId]);
    if (projects.length > 0) {
      let { totalAmount, receivedAmount, status } = projects[0];
      totalAmount = parseFloat(totalAmount);
      receivedAmount = parseFloat(receivedAmount);
      
      if (type === 'Paid') {
        receivedAmount += parseFloat(amount);
      }
      
      const pendingAmount = totalAmount - receivedAmount;
      const newStatus = status === 'Failed' && pendingAmount > 0
        ? 'Failed'
        : calculateStatus(pendingAmount, totalAmount);

      await connection.query(
        'UPDATE projects SET receivedAmount = ?, pendingAmount = ?, status = ? WHERE id = ?',
        [receivedAmount, pendingAmount, newStatus, projectId]
      );
    }

    await connection.commit();
    res.status(201).json({ id, projectId, amount, type, date, notes });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  } finally {
    connection.release();
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    
    const [txs] = await connection.query('SELECT projectId, amount, type FROM transactions WHERE id = ?', [id]);
    if (txs.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const { projectId, amount, type } = txs[0];

    await connection.query('DELETE FROM transactions WHERE id = ?', [id]);

    const [projects] = await connection.query('SELECT totalAmount, receivedAmount, status FROM projects WHERE id = ?', [projectId]);
    if (projects.length > 0) {
      let { totalAmount, receivedAmount, status } = projects[0];
      totalAmount = parseFloat(totalAmount);
      receivedAmount = parseFloat(receivedAmount);
      
      if (type === 'Paid') {
        receivedAmount -= parseFloat(amount);
      }
      
      const pendingAmount = totalAmount - receivedAmount;
      const newStatus = status === 'Failed' && pendingAmount > 0
        ? 'Failed'
        : calculateStatus(pendingAmount, totalAmount);

      await connection.query(
        'UPDATE projects SET receivedAmount = ?, pendingAmount = ?, status = ? WHERE id = ?',
        [receivedAmount, pendingAmount, newStatus, projectId]
      );
    }

    await connection.commit();
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  } finally {
    connection.release();
  }
});

const PORT = process.env.PORT || 5001;

db.initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
