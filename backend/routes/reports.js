const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

module.exports = (db) => {

  // GET /api/reports/achievement/:cycleId — exportable achievement report
  router.get('/achievement/:cycleId', auth, requireRole('manager', 'admin'), (req, res) => {
    const rows = db.prepare(`
      SELECT 
        u.name as employee_name, u.department, u.email,
        g.thrust_area, g.title, g.uom_type, g.weightage,
        g.target_value, g.target_date,
        qu.quarter, qu.actual_value, qu.actual_date,
        qu.status, qu.progress_score, qu.manager_comment,
        gs.status as sheet_status
      FROM goal_sheets gs
      JOIN users u ON gs.employee_id = u.id
      JOIN goals g ON g.sheet_id = gs.id
      LEFT JOIN quarterly_updates qu ON qu.goal_id = g.id
      WHERE gs.cycle_id = ?
      ORDER BY u.name, g.id, qu.quarter
    `).all(req.params.cycleId);

    if (req.query.format === 'csv') {
      const headers = ['Employee', 'Department', 'Email', 'Thrust Area', 'Goal Title', 'UoM Type', 'Weightage%',
        'Target', 'Target Date', 'Quarter', 'Actual', 'Actual Date', 'Status', 'Progress Score%', 'Manager Comment', 'Sheet Status'];
      const csvRows = rows.map(r => [
        r.employee_name, r.department, r.email, r.thrust_area, r.title, r.uom_type, r.weightage,
        r.target_value, r.target_date, r.quarter, r.actual_value, r.actual_date,
        r.status, r.progress_score ? r.progress_score.toFixed(1) : '', r.manager_comment, r.sheet_status
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=achievement_report.csv');
      return res.send([headers.join(','), ...csvRows].join('\n'));
    }

    res.json(rows);
  });

  // GET /api/reports/completion/:cycleId — completion dashboard
  router.get('/completion/:cycleId', auth, requireRole('manager', 'admin'), (req, res) => {
    const employees = db.prepare(`
      SELECT u.id, u.name, u.email, u.department,
        m.name as manager_name,
        gs.status as sheet_status,
        gs.submitted_at, gs.approved_at,
        (SELECT COUNT(*) FROM goals g WHERE g.sheet_id = gs.id) as goal_count,
        (SELECT COUNT(*) FROM goals g 
          JOIN quarterly_updates qu ON qu.goal_id = g.id 
          WHERE g.sheet_id = gs.id AND qu.quarter = 'Q1') as q1_updates,
        (SELECT COUNT(*) FROM goals g 
          JOIN quarterly_updates qu ON qu.goal_id = g.id 
          WHERE g.sheet_id = gs.id AND qu.quarter = 'Q2') as q2_updates,
        (SELECT COUNT(*) FROM goals g 
          JOIN quarterly_updates qu ON qu.goal_id = g.id 
          WHERE g.sheet_id = gs.id AND qu.quarter = 'Q3') as q3_updates,
        (SELECT COUNT(*) FROM goals g 
          JOIN quarterly_updates qu ON qu.goal_id = g.id 
          WHERE g.sheet_id = gs.id AND qu.quarter = 'Q4') as q4_updates
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      LEFT JOIN goal_sheets gs ON gs.employee_id = u.id AND gs.cycle_id = ?
      WHERE u.role = 'employee'
      ORDER BY u.department, u.name
    `).all(req.params.cycleId);

    const summary = {
      total_employees: employees.length,
      submitted: employees.filter(e => ['submitted', 'locked', 'approved'].includes(e.sheet_status)).length,
      approved: employees.filter(e => e.sheet_status === 'locked').length,
      not_started: employees.filter(e => !e.sheet_status || e.sheet_status === 'draft').length
    };

    res.json({ summary, employees });
  });

  // GET /api/reports/audit — audit trail
  router.get('/audit', auth, requireRole('admin'), (req, res) => {
    const { limit = 100, offset = 0, entity_type } = req.query;
    let query = `
      SELECT al.*, u.name as user_name, u.role as user_role
      FROM audit_logs al JOIN users u ON al.user_id = u.id
    `;
    const params = [];
    if (entity_type) { query += ' WHERE al.entity_type = ?'; params.push(entity_type); }
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const logs = db.prepare(query).all(...params);
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM audit_logs${entity_type ? ' WHERE entity_type = ?' : ''}`).get(...(entity_type ? [entity_type] : [])).cnt;

    res.json({ logs, total });
  });

  // GET /api/reports/analytics/:cycleId — analytics for dashboard
  router.get('/analytics/:cycleId', auth, requireRole('manager', 'admin'), (req, res) => {
    const cycleId = req.params.cycleId;

    // Department-wise completion
    const deptStats = db.prepare(`
      SELECT u.department,
        COUNT(DISTINCT u.id) as total_employees,
        COUNT(DISTINCT CASE WHEN gs.status = 'locked' THEN u.id END) as approved,
        COUNT(DISTINCT CASE WHEN gs.status = 'submitted' THEN u.id END) as submitted,
        AVG(qu.progress_score) as avg_score
      FROM users u
      LEFT JOIN goal_sheets gs ON gs.employee_id = u.id AND gs.cycle_id = ?
      LEFT JOIN goals g ON g.sheet_id = gs.id
      LEFT JOIN quarterly_updates qu ON qu.goal_id = g.id
      WHERE u.role = 'employee'
      GROUP BY u.department
    `).all(cycleId);

    // Thrust area distribution
    const thrustDist = db.prepare(`
      SELECT g.thrust_area, COUNT(*) as goal_count, AVG(g.weightage) as avg_weightage
      FROM goals g JOIN goal_sheets gs ON g.sheet_id = gs.id
      WHERE gs.cycle_id = ?
      GROUP BY g.thrust_area ORDER BY goal_count DESC
    `).all(cycleId);

    // UoM type breakdown
    const uomBreakdown = db.prepare(`
      SELECT g.uom_type, COUNT(*) as count
      FROM goals g JOIN goal_sheets gs ON g.sheet_id = gs.id
      WHERE gs.cycle_id = ?
      GROUP BY g.uom_type
    `).all(cycleId);

    // Quarter-wise progress
    const quarterProgress = db.prepare(`
      SELECT qu.quarter, 
        AVG(qu.progress_score) as avg_score,
        COUNT(DISTINCT qu.goal_id) as updated_goals,
        COUNT(DISTINCT CASE WHEN qu.status = 'completed' THEN qu.goal_id END) as completed
      FROM quarterly_updates qu
      JOIN goals g ON qu.goal_id = g.id
      JOIN goal_sheets gs ON g.sheet_id = gs.id
      WHERE gs.cycle_id = ?
      GROUP BY qu.quarter ORDER BY qu.quarter
    `).all(cycleId);

    // Manager effectiveness
    const managerStats = db.prepare(`
      SELECT m.name as manager_name, m.id as manager_id,
        COUNT(DISTINCT u.id) as team_size,
        COUNT(DISTINCT CASE WHEN gs.status = 'locked' THEN u.id END) as approved_count,
        COUNT(DISTINCT qu.id) as total_checkins
      FROM users m
      JOIN users u ON u.manager_id = m.id
      LEFT JOIN goal_sheets gs ON gs.employee_id = u.id AND gs.cycle_id = ?
      LEFT JOIN goals g ON g.sheet_id = gs.id
      LEFT JOIN quarterly_updates qu ON qu.goal_id = g.id AND qu.manager_id = m.id
      WHERE m.role = 'manager'
      GROUP BY m.id
    `).all(cycleId);

    res.json({ deptStats, thrustDist, uomBreakdown, quarterProgress, managerStats });
  });

  // GET /api/reports/users — user management for admin and manager
  router.get('/users', auth, requireRole('admin', 'manager'), (req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.department, m.name as manager_name
      FROM users u LEFT JOIN users m ON u.manager_id = m.id
      ORDER BY u.role, u.name
    `).all();
    res.json(users);
  });

  return router;
};
