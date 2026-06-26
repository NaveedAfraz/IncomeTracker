const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'null') return callback(null, true);
    const allowedOrigins = [process.env.FRONTEND_URL, 'https://incometracker-uu7p.onrender.com'].filter(Boolean);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userName = decoded.name;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const calculateStatus = (pending, total, override = null) => {
  let status = override;
  if (status === 'Completed' && pending > 0) status = null;
  if (status && ['Ongoing', 'Completed', 'Pending', 'High Pending', 'Failed'].includes(status)) return status;
  if (total === 0) return 'Ongoing';
  if (pending <= 0) return 'Completed';
  if (pending > total * 0.5) return 'High Pending';
  return 'Pending';
};

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

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [existing] = await db.pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 12);
    await db.pool.query(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [id, name.trim(), email.toLowerCase().trim(), password_hash]
    );

    const token = jwt.sign({ userId: id, name: name.trim() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name: name.trim(), email: email.toLowerCase().trim() } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [users] = await db.pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const [users] = await db.pool.query('SELECT id, name, email FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── Projects API (auth-protected, user-scoped) ────────────────────────────────
app.get('/api/projects', authenticate, async (req, res) => {
  try {
    const [projects] = await db.pool.query('SELECT * FROM projects WHERE userId = ? ORDER BY created_at DESC', [req.userId]);
    const [transactions] = await db.pool.query(
      'SELECT t.* FROM transactions t INNER JOIN projects p ON t.projectId = p.id WHERE p.userId = ? ORDER BY t.date DESC, t.created_at DESC',
      [req.userId]
    );
    
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

app.post('/api/projects', authenticate, async (req, res) => {
  try {
    const { name, client, type, startDate, endDate, totalAmount, receivedAmount, notes, statusOverride } = req.body;
    const id = uuidv4();
    const pendingAmount = totalAmount - receivedAmount;
    const status = calculateStatus(pendingAmount, totalAmount, statusOverride);
    const period = buildPeriod(startDate, endDate || null);

    await db.pool.query(
      'INSERT INTO projects (id, userId, name, client, type, period, startDate, endDate, totalAmount, receivedAmount, pendingAmount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.userId, name, client, type, period, startDate || null, endDate || null, totalAmount, receivedAmount, pendingAmount, status, notes]
    );

    res.status(201).json({ id, userId: req.userId, name, client, type, period, startDate: startDate || null, endDate: endDate || null, totalAmount, receivedAmount, pendingAmount, status, notes, transactions: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, client, type, startDate, endDate, totalAmount, receivedAmount, notes, statusOverride } = req.body;
    
    // Ensure the project belongs to this user
    const [owned] = await db.pool.query('SELECT id FROM projects WHERE id = ? AND userId = ?', [id, req.userId]);
    if (owned.length === 0) return res.status(403).json({ error: 'Project not found or access denied' });

    const pendingAmount = totalAmount - receivedAmount;
    const status = calculateStatus(pendingAmount, totalAmount, statusOverride);
    const period = buildPeriod(startDate, endDate || null);

    await db.pool.query(
      'UPDATE projects SET name = ?, client = ?, type = ?, period = ?, startDate = ?, endDate = ?, totalAmount = ?, receivedAmount = ?, pendingAmount = ?, status = ?, notes = ? WHERE id = ? AND userId = ?',
      [name, client, type, period, startDate || null, endDate || null, totalAmount, receivedAmount, pendingAmount, status, notes, id, req.userId]
    );

    res.json({ id, userId: req.userId, name, client, type, period, startDate: startDate || null, endDate: endDate || null, totalAmount, receivedAmount, pendingAmount, status, notes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [owned] = await db.pool.query('SELECT id FROM projects WHERE id = ? AND userId = ?', [id, req.userId]);
    if (owned.length === 0) return res.status(403).json({ error: 'Project not found or access denied' });

    await db.pool.query('DELETE FROM projects WHERE id = ? AND userId = ?', [id, req.userId]);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ─── Transactions API (auth-protected) ────────────────────────────────────────
app.post('/api/transactions', authenticate, async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const { projectId, amount, type, date, notes } = req.body;

    // Ensure the project belongs to this user
    const [owned] = await connection.query('SELECT id FROM projects WHERE id = ? AND userId = ?', [projectId, req.userId]);
    if (owned.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'Project not found or access denied' });
    }

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
      
      if (type === 'Paid') receivedAmount += parseFloat(amount);
      
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

app.delete('/api/transactions/:id', authenticate, async (req, res) => {
  const connection = await db.pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    
    const [txs] = await connection.query(
      'SELECT t.projectId, t.amount, t.type FROM transactions t INNER JOIN projects p ON t.projectId = p.id WHERE t.id = ? AND p.userId = ?',
      [id, req.userId]
    );
    if (txs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const { projectId, amount, type } = txs[0];

    await connection.query('DELETE FROM transactions WHERE id = ?', [id]);

    const [projects] = await connection.query('SELECT totalAmount, receivedAmount, status FROM projects WHERE id = ?', [projectId]);
    if (projects.length > 0) {
      let { totalAmount, receivedAmount, status } = projects[0];
      totalAmount = parseFloat(totalAmount);
      receivedAmount = parseFloat(receivedAmount);
      
      if (type === 'Paid') receivedAmount -= parseFloat(amount);
      
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
