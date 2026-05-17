const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'atomquest.db');

function initDB() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('employee', 'manager', 'admin')),
      department TEXT,
      manager_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goal_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      goal_setting_start TEXT,
      goal_setting_end TEXT,
      q1_start TEXT, q1_end TEXT,
      q2_start TEXT, q2_end TEXT,
      q3_start TEXT, q3_end TEXT,
      q4_start TEXT, q4_end TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goal_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES users(id),
      cycle_id INTEGER NOT NULL REFERENCES goal_cycles(id),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','returned','locked')),
      submitted_at TEXT,
      approved_at TEXT,
      approved_by INTEGER REFERENCES users(id),
      manager_comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(employee_id, cycle_id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_id INTEGER NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
      thrust_area TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      uom_type TEXT NOT NULL CHECK(uom_type IN ('numeric_min','numeric_max','timeline','zero')),
      target_value REAL,
      target_date TEXT,
      weightage REAL NOT NULL,
      is_shared INTEGER DEFAULT 0,
      parent_goal_id INTEGER REFERENCES goals(id),
      primary_owner_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quarterly_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      quarter TEXT NOT NULL CHECK(quarter IN ('Q1','Q2','Q3','Q4')),
      actual_value REAL,
      actual_date TEXT,
      status TEXT CHECK(status IN ('not_started','on_track','completed')),
      progress_score REAL,
      employee_remark TEXT,
      manager_comment TEXT,
      manager_id INTEGER REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(goal_id, quarter)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default users
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@atomberg.com');
  if (!existingAdmin) {
    const hash = (pwd) => bcrypt.hashSync(pwd, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role, department, manager_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Admin
    const adminId = insertUser.run('Admin HR', 'admin@atomberg.com', hash('Admin@123'), 'admin', 'HR', null).lastInsertRowid;

    // Manager
    const managerId = insertUser.run('Rajesh Kumar', 'manager@atomberg.com', hash('Manager@123'), 'manager', 'Engineering', adminId).lastInsertRowid;

    // Employees
    insertUser.run('Priya Sharma', 'employee1@atomberg.com', hash('Employee@123'), 'employee', 'Engineering', managerId);
    insertUser.run('Amit Verma', 'employee2@atomberg.com', hash('Employee@123'), 'employee', 'Engineering', managerId);
    insertUser.run('Sneha Patel', 'employee3@atomberg.com', hash('Employee@123'), 'employee', 'Sales', managerId);

    // Seed active cycle
    db.prepare(`
      INSERT INTO goal_cycles (name, year, goal_setting_start, goal_setting_end, q1_start, q1_end, q2_start, q2_end, q3_start, q3_end, q4_start, q4_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'FY 2025-26', 2026,
      '2025-05-01', '2025-06-30',
      '2025-07-01', '2025-09-30',
      '2025-10-01', '2025-12-31',
      '2026-01-01', '2026-03-31',
      '2026-04-01', '2026-04-30'
    );

    console.log('✅ Database seeded with demo users and cycle');
  }

  return db;
}

module.exports = { initDB, DB_PATH };
