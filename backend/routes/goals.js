const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

module.exports = (db) => {
  const logAudit = (userId, action, entityType, entityId, oldVal, newVal, ip) => {
    db.prepare(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(userId, action, entityType, entityId,
      oldVal ? JSON.stringify(oldVal) : null, newVal ? JSON.stringify(newVal) : null, ip);
  };

  const computeScore = (goal, update) => {
    if (!update.actual_value && !update.actual_date) return null;
    switch (goal.uom_type) {
      case 'numeric_min':
        return Math.min((update.actual_value / goal.target_value) * 100, 150);
      case 'numeric_max':
        if (!update.actual_value) return null;
        return Math.min((goal.target_value / update.actual_value) * 100, 150);
      case 'timeline': {
        if (!update.actual_date || !goal.target_date) return null;
        const target = new Date(goal.target_date);
        const actual = new Date(update.actual_date);
        return actual <= target ? 100 : Math.max(0, 100 - ((actual - target) / (1000 * 60 * 60 * 24)) * 2);
      }
      case 'zero':
        return update.actual_value === 0 ? 100 : 0;
      default:
        return null;
    }
  };

  // GET /api/goals/cycles
  router.get('/cycles', auth, (req, res) => {
    const cycles = db.prepare('SELECT * FROM goal_cycles ORDER BY year DESC').all();
    res.json(cycles);
  });

  // GET /api/goals/my-sheet/:cycleId
  router.get('/my-sheet/:cycleId', auth, (req, res) => {
    const sheet = db.prepare(`
      SELECT gs.*, u.name as employee_name, u.email as employee_email, u.department
      FROM goal_sheets gs JOIN users u ON gs.employee_id = u.id
      WHERE gs.employee_id = ? AND gs.cycle_id = ?
    `).get(req.user.id, req.params.cycleId);

    if (!sheet) return res.json({ sheet: null, goals: [] });

    const goals = db.prepare('SELECT * FROM goals WHERE sheet_id = ? ORDER BY id').all(sheet.id);
    const goalsWithUpdates = goals.map(g => ({
      ...g,
      updates: db.prepare('SELECT * FROM quarterly_updates WHERE goal_id = ? ORDER BY quarter').all(g.id)
    }));

    res.json({ sheet, goals: goalsWithUpdates });
  });

  // POST /api/goals/sheet — create or update draft
  router.post('/sheet', auth, requireRole('employee'), (req, res) => {
    const { cycle_id, goals } = req.body;
    if (!cycle_id || !goals || !Array.isArray(goals)) {
      return res.status(400).json({ error: 'cycle_id and goals array required' });
    }

    // Validate
    if (goals.length > 8) return res.status(400).json({ error: 'Maximum 8 goals allowed' });
    if (goals.some(g => g.weightage < 10)) return res.status(400).json({ error: 'Minimum weightage per goal is 10%' });
    const totalWeight = goals.reduce((s, g) => s + Number(g.weightage), 0);
    if (Math.abs(totalWeight - 100) > 0.01) return res.status(400).json({ error: `Total weightage must be 100%. Currently: ${totalWeight}%` });
    if (goals.some(g => !g.title || !g.thrust_area || !g.uom_type)) {
      return res.status(400).json({ error: 'Each goal must have title, thrust_area, and uom_type' });
    }

    const cycle = db.prepare('SELECT * FROM goal_cycles WHERE id = ?').get(cycle_id);
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });

    // Check existing sheet
    let sheet = db.prepare('SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?').get(req.user.id, cycle_id);

    if (sheet && ['approved', 'locked'].includes(sheet.status)) {
      return res.status(403).json({ error: 'Goal sheet is locked. Contact admin to make changes.' });
    }

    const insertOrUpdateSheet = db.transaction(() => {
      if (!sheet) {
        const result = db.prepare(`
          INSERT INTO goal_sheets (employee_id, cycle_id, status) VALUES (?, ?, 'draft')
        `).run(req.user.id, cycle_id);
        sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(result.lastInsertRowid);
      } else {
        db.prepare("UPDATE goal_sheets SET status = 'draft', updated_at = datetime('now') WHERE id = ?").run(sheet.id);
        db.prepare('DELETE FROM goals WHERE sheet_id = ? AND is_shared = 0').run(sheet.id);
      }

      for (const g of goals) {
        db.prepare(`
          INSERT INTO goals (sheet_id, thrust_area, title, description, uom_type, target_value, target_date, weightage, is_shared, primary_owner_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).run(sheet.id, g.thrust_area, g.title, g.description || '', g.uom_type,
          g.target_value || null, g.target_date || null, g.weightage, req.user.id);
      }

      logAudit(req.user.id, 'SAVE_DRAFT', 'goal_sheet', sheet.id, null, { goals_count: goals.length }, req.ip);
    });

    insertOrUpdateSheet();
    res.json({ message: 'Draft saved successfully', sheet_id: sheet.id });
  });

  // POST /api/goals/sheet/:id/submit
  router.post('/sheet/:id/submit', auth, requireRole('employee'), (req, res) => {
    const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ? AND employee_id = ?').get(req.params.id, req.user.id);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (!['draft', 'returned'].includes(sheet.status)) {
      return res.status(400).json({ error: 'Only draft or returned sheets can be submitted' });
    }

    const goals = db.prepare('SELECT * FROM goals WHERE sheet_id = ?').all(sheet.id);
    if (goals.length === 0) return res.status(400).json({ error: 'Add at least one goal before submitting' });
    if (goals.length > 8) return res.status(400).json({ error: 'Maximum 8 goals allowed' });

    const totalWeight = goals.reduce((s, g) => s + g.weightage, 0);
    if (Math.abs(totalWeight - 100) > 0.01) return res.status(400).json({ error: `Total weightage must equal 100%. Currently: ${totalWeight}%` });

    db.prepare("UPDATE goal_sheets SET status = 'submitted', submitted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(sheet.id);
    logAudit(req.user.id, 'SUBMIT', 'goal_sheet', sheet.id, { status: 'draft' }, { status: 'submitted' }, req.ip);

    res.json({ message: 'Goal sheet submitted for manager approval' });
  });

  // GET /api/goals/team-sheets/:cycleId — manager view
  router.get('/team-sheets/:cycleId', auth, requireRole('manager', 'admin'), (req, res) => {
    let sheets;
    if (req.user.role === 'admin') {
      sheets = db.prepare(`
        SELECT gs.*, u.name as employee_name, u.email as employee_email, u.department,
          m.name as manager_name
        FROM goal_sheets gs 
        JOIN users u ON gs.employee_id = u.id
        LEFT JOIN users m ON u.manager_id = m.id
        WHERE gs.cycle_id = ?
        ORDER BY gs.updated_at DESC
      `).all(req.params.cycleId);
    } else {
      sheets = db.prepare(`
        SELECT gs.*, u.name as employee_name, u.email as employee_email, u.department
        FROM goal_sheets gs JOIN users u ON gs.employee_id = u.id
        WHERE gs.cycle_id = ? AND u.manager_id = ?
        ORDER BY gs.updated_at DESC
      `).all(req.params.cycleId, req.user.id);
    }

    const enriched = sheets.map(s => ({
      ...s,
      goals: db.prepare('SELECT * FROM goals WHERE sheet_id = ?').all(s.id)
    }));
    res.json(enriched);
  });

  // POST /api/goals/sheet/:id/approve — manager approves
  router.post('/sheet/:id/approve', auth, requireRole('manager', 'admin'), (req, res) => {
    const { comment, goal_edits } = req.body;
    const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (sheet.status !== 'submitted') return res.status(400).json({ error: 'Only submitted sheets can be approved' });

    const approveSheet = db.transaction(() => {
      // Apply manager edits to goals if provided
      if (goal_edits && Array.isArray(goal_edits)) {
        for (const edit of goal_edits) {
          const old = db.prepare('SELECT * FROM goals WHERE id = ? AND sheet_id = ?').get(edit.id, sheet.id);
          if (old) {
            db.prepare('UPDATE goals SET target_value = ?, weightage = ?, target_date = ? WHERE id = ?')
              .run(edit.target_value ?? old.target_value, edit.weightage ?? old.weightage, edit.target_date ?? old.target_date, edit.id);
            logAudit(req.user.id, 'MANAGER_EDIT_GOAL', 'goal', edit.id, old, edit, req.ip);
          }
        }
      }

      db.prepare(`UPDATE goal_sheets SET status = 'locked', approved_at = datetime('now'), 
        approved_by = ?, manager_comment = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(req.user.id, comment || null, sheet.id);

      logAudit(req.user.id, 'APPROVE', 'goal_sheet', sheet.id, { status: 'submitted' }, { status: 'locked' }, req.ip);
    });

    approveSheet();
    res.json({ message: 'Goal sheet approved and locked' });
  });

  // POST /api/goals/sheet/:id/return — manager returns for rework
  router.post('/sheet/:id/return', auth, requireRole('manager', 'admin'), (req, res) => {
    const { comment } = req.body;
    const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });
    if (sheet.status !== 'submitted') return res.status(400).json({ error: 'Only submitted sheets can be returned' });

    db.prepare("UPDATE goal_sheets SET status = 'returned', manager_comment = ?, updated_at = datetime('now') WHERE id = ?")
      .run(comment || 'Returned for rework', sheet.id);
    logAudit(req.user.id, 'RETURN', 'goal_sheet', sheet.id, { status: 'submitted' }, { status: 'returned', comment }, req.ip);

    res.json({ message: 'Sheet returned for rework' });
  });

  // POST /api/goals/sheet/:id/unlock — admin unlocks
  router.post('/sheet/:id/unlock', auth, requireRole('admin'), (req, res) => {
    const { reason } = req.body;
    const sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(req.params.id);
    if (!sheet) return res.status(404).json({ error: 'Sheet not found' });

    db.prepare("UPDATE goal_sheets SET status = 'approved', updated_at = datetime('now') WHERE id = ?").run(sheet.id);
    logAudit(req.user.id, 'ADMIN_UNLOCK', 'goal_sheet', sheet.id, { status: 'locked' }, { status: 'approved', reason }, req.ip);

    res.json({ message: 'Sheet unlocked for editing' });
  });

  // POST /api/goals/quarterly-update — employee logs achievement
  router.post('/quarterly-update', auth, requireRole('employee'), (req, res) => {
    const { goal_id, quarter, actual_value, actual_date, status, remark } = req.body;
    if (!goal_id || !quarter) return res.status(400).json({ error: 'goal_id and quarter required' });

    const goal = db.prepare(`
      SELECT g.*, gs.employee_id FROM goals g JOIN goal_sheets gs ON g.sheet_id = gs.id
      WHERE g.id = ? AND gs.employee_id = ? AND gs.status = 'locked'
    `).get(goal_id, req.user.id);

    if (!goal) return res.status(404).json({ error: 'Goal not found or sheet not approved yet' });

    const score = computeScore(goal, { actual_value, actual_date });

    const existing = db.prepare('SELECT id FROM quarterly_updates WHERE goal_id = ? AND quarter = ?').get(goal_id, quarter);
    if (existing) {
      db.prepare(`UPDATE quarterly_updates SET actual_value = ?, actual_date = ?, status = ?, 
        progress_score = ?, employee_remark = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(actual_value ?? null, actual_date ?? null, status ?? 'not_started', score, remark ?? null, existing.id);
    } else {
      db.prepare(`INSERT INTO quarterly_updates (goal_id, quarter, actual_value, actual_date, status, progress_score, employee_remark)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(goal_id, quarter, actual_value ?? null, actual_date ?? null, status ?? 'not_started', score, remark ?? null);
    }

    logAudit(req.user.id, 'QUARTERLY_UPDATE', 'quarterly_update', goal_id, null, { quarter, actual_value, score }, req.ip);
    res.json({ message: 'Achievement updated', progress_score: score });
  });

  // POST /api/goals/checkin-comment — manager adds check-in comment
  router.post('/checkin-comment', auth, requireRole('manager', 'admin'), (req, res) => {
    const { goal_id, quarter, comment } = req.body;

    const update = db.prepare('SELECT * FROM quarterly_updates WHERE goal_id = ? AND quarter = ?').get(goal_id, quarter);
    if (!update) return res.status(404).json({ error: 'No update found for this goal and quarter' });

    db.prepare("UPDATE quarterly_updates SET manager_comment = ?, manager_id = ?, updated_at = datetime('now') WHERE goal_id = ? AND quarter = ?")
      .run(comment, req.user.id, goal_id, quarter);

    logAudit(req.user.id, 'CHECKIN_COMMENT', 'quarterly_update', update.id, null, { comment, quarter }, req.ip);
    res.json({ message: 'Check-in comment saved' });
  });

  // POST /api/goals/shared-goal — admin/manager pushes shared KPI
  router.post('/shared-goal', auth, requireRole('manager', 'admin'), (req, res) => {
    const { cycle_id, employee_ids, thrust_area, title, description, uom_type, target_value, target_date } = req.body;
    if (!employee_ids?.length) return res.status(400).json({ error: 'employee_ids required' });

    const addShared = db.transaction(() => {
      for (const empId of employee_ids) {
        let sheet = db.prepare('SELECT * FROM goal_sheets WHERE employee_id = ? AND cycle_id = ?').get(empId, cycle_id);
        if (!sheet) {
          const r = db.prepare("INSERT INTO goal_sheets (employee_id, cycle_id, status) VALUES (?, ?, 'draft')").run(empId, cycle_id);
          sheet = db.prepare('SELECT * FROM goal_sheets WHERE id = ?').get(r.lastInsertRowid);
        }
        if (['approved', 'locked'].includes(sheet.status)) continue;

        db.prepare(`INSERT INTO goals (sheet_id, thrust_area, title, description, uom_type, target_value, target_date, weightage, is_shared, primary_owner_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, 10, 1, ?)`)
          .run(sheet.id, thrust_area, title, description || '', uom_type, target_value || null, target_date || null, req.user.id);
      }
      logAudit(req.user.id, 'PUSH_SHARED_GOAL', 'goal', null, null, { title, employee_count: employee_ids.length }, req.ip);
    });
    addShared();
    res.json({ message: `Shared goal pushed to ${employee_ids.length} employees` });
  });

  return router;
};
