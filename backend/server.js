const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

const calculateStatus = (pending, total) => {
  if (total === 0) return 'Ongoing';
  if (pending <= 0) return 'Completed';
  if (pending > total * 0.5) return 'High Pending';
  return 'Pending';
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
    const { name, client, type, period, totalAmount, receivedAmount, notes } = req.body;
    const id = uuidv4();
    const pendingAmount = totalAmount - receivedAmount;
    const status = calculateStatus(pendingAmount, totalAmount);

    await db.pool.query(
      'INSERT INTO projects (id, name, client, type, period, totalAmount, receivedAmount, pendingAmount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, client, type, period, totalAmount, receivedAmount, pendingAmount, status, notes]
    );

    res.status(201).json({ id, name, client, type, period, totalAmount, receivedAmount, pendingAmount, status, notes, transactions: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, client, type, period, totalAmount, receivedAmount, notes } = req.body;
    
    const pendingAmount = totalAmount - receivedAmount;
    const status = calculateStatus(pendingAmount, totalAmount);

    await db.pool.query(
      'UPDATE projects SET name = ?, client = ?, type = ?, period = ?, totalAmount = ?, receivedAmount = ?, pendingAmount = ?, status = ?, notes = ? WHERE id = ?',
      [name, client, type, period, totalAmount, receivedAmount, pendingAmount, status, notes, id]
    );

    res.json({ id, name, client, type, period, totalAmount, receivedAmount, pendingAmount, status, notes });
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

    const [projects] = await connection.query('SELECT totalAmount, receivedAmount FROM projects WHERE id = ?', [projectId]);
    if (projects.length > 0) {
      let { totalAmount, receivedAmount } = projects[0];
      totalAmount = parseFloat(totalAmount);
      receivedAmount = parseFloat(receivedAmount);
      
      if (type === 'Paid') {
        receivedAmount += parseFloat(amount);
      }
      
      const pendingAmount = totalAmount - receivedAmount;
      const status = calculateStatus(pendingAmount, totalAmount);

      await connection.query(
        'UPDATE projects SET receivedAmount = ?, pendingAmount = ?, status = ? WHERE id = ?',
        [receivedAmount, pendingAmount, status, projectId]
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

    const [projects] = await connection.query('SELECT totalAmount, receivedAmount FROM projects WHERE id = ?', [projectId]);
    if (projects.length > 0) {
      let { totalAmount, receivedAmount } = projects[0];
      totalAmount = parseFloat(totalAmount);
      receivedAmount = parseFloat(receivedAmount);
      
      if (type === 'Paid') {
        receivedAmount -= parseFloat(amount);
      }
      
      const pendingAmount = totalAmount - receivedAmount;
      const status = calculateStatus(pendingAmount, totalAmount);

      await connection.query(
        'UPDATE projects SET receivedAmount = ?, pendingAmount = ?, status = ? WHERE id = ?',
        [receivedAmount, pendingAmount, status, projectId]
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
