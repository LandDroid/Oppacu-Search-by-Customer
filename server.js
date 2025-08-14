const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');

const app = express();

// === CORS & JSON Setup ===
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// === In-memory Session Store ===
const sessions = {};
const SESSION_TIMEOUT_MINUTES = 30;

// === SQL Server Base Config ===
const baseSqlConfig = {
  server: 'localhost',
  database: 'July2025',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  port: 1433,
};

// === Serve React Frontend ===
app.use(express.static(path.join(__dirname, 'frontend/build')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// === Login Endpoint ===
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const userSqlConfig = { ...baseSqlConfig, user: username, password };
  try {
    const pool = await sql.connect(userSqlConfig);
    await pool.close();

    const sessionId = Math.random().toString(36).substring(2);
    sessions[sessionId] = { username, password, createdAt: Date.now() };
    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// === Logout Endpoint ===
app.post('/logout', (req, res) => {
  const sessionId = req.headers['authorization'];
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
  }
  res.json({ success: true });
});

// === Session Auth Middleware for /query paths ===
app.use('/query', (req, res, next) => {
  const sessionId = req.headers['authorization'];
  const session = sessions[sessionId];
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const ageMinutes = (Date.now() - session.createdAt) / 60000;
  if (ageMinutes > SESSION_TIMEOUT_MINUTES) {
    delete sessions[sessionId];
    return res.status(401).json({ error: 'Session expired' });
  }

  session.createdAt = Date.now();
  next();
});

// === Get All Customers (Paginated) ===
app.get('/query/cust', async (req, res) => {
  const sessionId = req.headers['authorization'];
  const session = sessions[sessionId];
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const offset = (page - 1) * limit;

  const userSqlConfig = { ...baseSqlConfig, user: session.username, password: session.password };

  try {
    const pool = await sql.connect(userSqlConfig);
    const result = await pool.request().query(`
      SELECT top (100)
      no_, 
          name, 
          surname, 
          addr1,
          addr2,
          pc,
          pb,
          formatted_phone,
          email
      
      FROM July2025.dbo.cust
      ORDER BY name
    `);
    console.log("Fetched customers:", result.recordset.length);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Failed to fetch paginated cust:', err.message);
    res.status(500).json({ error: 'Failed to load customer data' });
  }
});

// === Search Customers (across all rows) ===
app.get('/query/cust/search', async (req, res) => {
  const sessionId = req.headers['authorization'];
  const session = sessions[sessionId];
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const { column, term } = req.query;
  const allowedColumns = ['no_', 'name', 'surname', 'addr1', 'addr2', 'pc', 'pb', 'email', 'formatted_phone'];
  if (!allowedColumns.includes(column)) {
    return res.status(400).json({ error: 'Invalid search column' });
  }

  const userSqlConfig = {
    ...baseSqlConfig,
    user: session.username,
    password: session.password,
  };

  try {
    const pool = await sql.connect(userSqlConfig);
    const result = await pool
      .request()
      .input('term', sql.VarChar, `%${term}%`)
      .query(`
        SELECT 
          no_, 
          name, 
          surname, 
          addr1,
          addr2,
          pc,
          pb,
          formatted_phone,
          email
      
        FROM July2025.dbo.cust
        WHERE ${column} LIKE @term
        ORDER BY name
      `);

    console.log(`🔍 Search results for "${term}" in ${column}:`, result.recordset.length);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ Search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});


// === Start the Server ===
const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
