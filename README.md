# ⚡ AtomQuest — Goal Setting & Tracking Portal
### Atomberg Technologies | AtomQuest Hackathon 2026

---

## 🚀 Quick Start (Run in 5 minutes)

### Prerequisites
- Node.js 18+ 
- npm 9+

### Step 1 — Install & Start Backend
```bash
cd backend
npm install
node server.js
```
Backend runs on → http://localhost:5000

### Step 2 — Install & Start Frontend (new terminal)
```bash
cd frontend
npm install
npm start
```
Frontend runs on → http://localhost:3000

> 💡 The frontend proxies API requests to backend automatically.

---

## 🔐 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| 👤 Employee 1 | employee1@atomberg.com | Employee@123 |
| 👤 Employee 2 | employee2@atomberg.com | Employee@123 |
| 👔 Manager | manager@atomberg.com | Manager@123 |
| 🛡️ Admin/HR | admin@atomberg.com | Admin@123 |

---

## 📋 Features Implemented

### Phase 1 — Goal Creation & Approval ✅
- Employee creates goals with Thrust Area, Title, UoM Type, Target, Weightage
- **Validation Rules Enforced:**
  - Max 8 goals per employee
  - Min 10% weightage per goal
  - Total weightage must = 100%
- Manager L1 approval workflow (Approve / Return for rework)
- Manager can edit targets & weightages inline before approval
- Goals locked after approval (no edits without Admin intervention)
- **Shared Goals** — Admin/Manager can push KPIs to multiple employees
- Admin can unlock goal sheets when needed

### Phase 2 — Achievement Tracking & Quarterly Check-ins ✅
- Quarterly update interface for employees (Q1/Q2/Q3/Q4)
- Status selection: Not Started / On Track / Completed
- **Auto-computed progress scores by UoM type:**
  - `numeric_min` → Achievement ÷ Target × 100
  - `numeric_max` → Target ÷ Achievement × 100  
  - `timeline` → Date-based scoring vs deadline
  - `zero` → 0 = 100%, else 0%
- Manager check-in module with structured comments

### Reporting & Governance ✅
- **Achievement Report** — Exportable CSV with Planned vs Actual for all employees
- **Completion Dashboard** — Real-time status of all employees & check-ins
- **Audit Trail** — Full log of who changed what and when (post-lock tracking)

### Bonus Analytics Module ✅
- Department-wise approval status bar charts
- Thrust area distribution pie chart
- Quarter-on-Quarter progress line chart
- UoM type breakdown
- Manager effectiveness dashboard

---

## 🏗️ Architecture

```
atomquest/
├── backend/
│   ├── server.js          # Express app entry point
│   ├── database.js        # SQLite init + seeding
│   ├── middleware/
│   │   └── auth.js        # JWT authentication
│   └── routes/
│       ├── auth.js        # Login, /me
│       ├── goals.js       # Goal CRUD, approval, quarterly updates
│       └── reports.js     # Achievement, completion, audit, analytics
└── frontend/
    └── src/
        ├── App.js         # Router + protected routes
        ├── context/
        │   └── AuthContext.js
        ├── components/
        │   └── Layout.js  # Sidebar navigation
        ├── pages/
        │   ├── Login.js
        │   ├── Dashboard.js
        │   ├── MyGoals.js          # Employee goal creation
        │   ├── TeamGoals.js        # Manager approval workflow
        │   ├── QuarterlyUpdate.js  # Achievement logging
        │   ├── Checkins.js         # Manager check-ins
        │   ├── SharedGoals.js      # Push shared KPIs
        │   ├── Reports.js          # Completion dashboard + CSV export
        │   ├── Analytics.js        # Charts & analytics
        │   ├── Audit.js            # Audit trail
        │   └── Users.js            # User management
        └── utils/
            └── api.js     # Axios instance
```

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Recharts |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) — zero setup |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Styling | Pure CSS-in-JS |

### Why SQLite?
- **Zero configuration** — no separate DB server needed for demo
- **Portable** — entire DB is a single file
- **Production-ready** for this scale; can migrate to PostgreSQL easily

---

## 📊 Evaluation Criteria Mapping

| Criterion | How We Address It |
|-----------|-------------------|
| Functionality | All Phase 1 & 2 workflows complete end-to-end |
| BRD Adherence | All validation rules enforced in both frontend & backend |
| User Friendliness | Role-aware navigation, inline validation, helpful error messages |
| Bug-free | Input validation, JWT auth, error boundaries, try/catch everywhere |
| Good-to-Have | Analytics module implemented (Section 5.4) |
| Cost Optimisation | SQLite (no DB cost), single-server architecture, no external services needed |

---

## 🔗 Submission Checklist
- [x] Working demo URL (run locally with npm start)
- [x] Source code on GitHub
- [x] Architecture diagram (see above)
- [x] 3 role credentials (Employee / Manager / Admin)

---

Built with ❤️ for AtomQuest Hackathon 2026
