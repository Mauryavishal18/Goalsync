const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, auth } = require('../middleware/auth');

module.exports = (db) => {
  const logAudit = (userId, action, entityType, entityId, oldVal, newVal, ip) => {
    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(userId, action, entityType, entityId,
      oldVal ? JSON.stringify(oldVal) : null, newVal ? JSON.stringify(newVal) : null, ip);
  };

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, department: user.department },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    logAudit(user.id, 'LOGIN', 'user', user.id, null, { email: user.email }, req.ip);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department }
    });
  });

  // GET /api/auth/me
  router.get('/me', auth, (req, res) => {
    const user = db.prepare('SELECT id, name, email, role, department, manager_id FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  return router;
};
