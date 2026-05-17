require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Init DB
const db = initDB();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/goals', require('./routes/goals')(db));
app.use('/api/reports', require('./routes/reports')(db));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve static frontend only if build folder exists (production mode)
const fs = require('fs');
const buildPath = path.join(__dirname, '../frontend/build');
const buildExists = fs.existsSync(path.join(buildPath, 'index.html'));

if (buildExists) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.status(200).send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#f0f4ff">
        <h2>⚡ AtomQuest Backend is Running!</h2>
        <p>API is live at <a href="http://localhost:${PORT}/api/health">http://localhost:${PORT}/api/health</a></p>
        <p style="background:#fff3cd;padding:12px;border-radius:8px">
          👉 Open a second terminal and run:<br><br>
          <code style="background:#1e293b;color:#fff;padding:8px 14px;border-radius:6px">cd frontend &amp;&amp; npm install &amp;&amp; npm start</code><br><br>
          Then open <a href="http://localhost:3000">http://localhost:3000</a>
        </p>
      </body></html>
    `);
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   AtomQuest Goal Portal — v1.0       ║
  ║   Server running on port ${PORT}        ║
  ║   http://localhost:${PORT}              ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
