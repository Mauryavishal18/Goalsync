import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const currentQuarter = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 4 && m <= 6) return 'Q1';
  if (m >= 7 && m <= 9) return 'Q2';
  if (m >= 10 && m <= 12) return 'Q3';
  return 'Q4';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [mySheet, setMySheet] = useState(null);
  const [teamData, setTeamData] = useState([]);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/goals/cycles').then(r => {
      const list = Array.isArray(r.data) ? r.data : [];
      const active = list.find(c => c.is_active) || list[0] || null;
      setCycles(list);
      setActiveCycle(active);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeCycle) { setLoading(false); return; }
    const fetches = [];
    if (user.role === 'employee') {
      fetches.push(api.get(`/goals/my-sheet/${activeCycle.id}`).then(r => setMySheet(r.data)).catch(() => {}));
    }
    if (['manager', 'admin'].includes(user.role)) {
      fetches.push(api.get(`/goals/team-sheets/${activeCycle.id}`).then(r => setTeamData(Array.isArray(r.data) ? r.data : [])).catch(() => {}));
      fetches.push(api.get(`/reports/completion/${activeCycle.id}`).then(r => setCompletion(r.data)).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [activeCycle, user.role]);

  const statusColor = { draft: '#f59e0b', submitted: '#3b82f6', returned: '#ef4444', locked: '#10b981', approved: '#10b981' };
  const statusLabel = { draft: 'Draft', submitted: 'Pending Approval', returned: 'Returned for Rework', locked: '✅ Approved & Locked', approved: 'Approved' };

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.greeting}>Good {getGreeting()}, {user.name?.split(' ')[0]}! 👋</h1>
          <p style={styles.sub}>{activeCycle?.name} · {user.department} · {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
        </div>
        <div style={styles.quarterBadge}>
          <span style={styles.qLabel}>Active Quarter</span>
          <span style={styles.qValue}>{currentQuarter()}</span>
        </div>
      </div>

      {user.role === 'employee' && mySheet && (
        <>
          <div style={styles.grid3}>
            <StatCard icon="🎯" label="My Goals" value={mySheet.goals?.length || 0} color="#667eea" sub="Max 8 allowed" />
            <StatCard icon="📋" label="Sheet Status" value={statusLabel[mySheet.sheet?.status] || 'Not Started'} color={statusColor[mySheet.sheet?.status] || '#94a3b8'} sub="Current cycle" />
            <StatCard icon="⚖️" label="Total Weightage" value={`${mySheet.goals?.reduce((s, g) => s + g.weightage, 0) || 0}%`} color={mySheet.goals?.reduce((s, g) => s + g.weightage, 0) === 100 ? '#10b981' : '#ef4444'} sub="Must be 100%" />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>My Goal Sheet</h2>
              <button onClick={() => navigate('/my-goals')} style={styles.actionBtn}>
                {mySheet.sheet?.status === 'locked' ? 'View Goals' : 'Edit Goals →'}
              </button>
            </div>
            {!mySheet.sheet ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: 48 }}>📋</div>
                <p>No goal sheet created yet for this cycle.</p>
                <button onClick={() => navigate('/my-goals')} style={styles.primaryBtn}>Create Goal Sheet</button>
              </div>
            ) : (
              <div style={styles.goalsList}>
                {mySheet.goals?.map(goal => (
                  <div key={goal.id} style={styles.goalRow}>
                    <div style={styles.goalInfo}>
                      <span style={styles.thrustBadge}>{goal.thrust_area}</span>
                      <span style={styles.goalTitle}>{goal.title}</span>
                      {goal.is_shared === 1 && <span style={styles.sharedBadge}>Shared</span>}
                    </div>
                    <div style={styles.goalMeta}>
                      <span style={styles.metaItem}>{goal.uom_type}</span>
                      <span style={styles.weightBadge}>{goal.weightage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {mySheet.sheet?.status === 'locked' && mySheet.goals?.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Quarterly Progress</h2>
                <button onClick={() => navigate('/quarterly-update')} style={styles.actionBtn}>Update →</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Goal</th>
                      {QUARTERS.map(q => <th key={q} style={styles.th}>{q}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {mySheet.goals?.map(goal => (
                      <tr key={goal.id}>
                        <td style={styles.td}>{goal.title}</td>
                        {QUARTERS.map(q => {
                          const upd = Array.isArray(goal.updates) ? goal.updates.find(u => u.quarter === q) : null;
                          return (
                            <td key={q} style={styles.td}>
                              {upd ? (
                                <div style={{ ...styles.scoreBadge, background: scoreColor(upd.progress_score) }}>
                                  {upd.progress_score ? `${upd.progress_score.toFixed(1)}%` : upd.status}
                                </div>
                              ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {['manager', 'admin'].includes(user.role) && completion && (
        <>
          <div style={styles.grid4}>
            <StatCard icon="👥" label="Total Employees" value={completion.summary?.total_employees || 0} color="#667eea" />
            <StatCard icon="✅" label="Approved" value={completion.summary?.approved || 0} color="#10b981" />
            <StatCard icon="⏳" label="Submitted" value={completion.summary?.submitted || 0} color="#3b82f6" />
            <StatCard icon="⚠️" label="Not Started" value={completion.summary?.not_started || 0} color="#f59e0b" />
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Team Goal Sheet Status</h2>
              <button onClick={() => navigate('/team-goals')} style={styles.actionBtn}>View All →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Department</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Goals</th>
                    <th style={styles.th}>Q1</th>
                    <th style={styles.th}>Q2</th>
                    <th style={styles.th}>Q3</th>
                    <th style={styles.th}>Q4</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(completion.employees || []).map(emp => (
                    <tr key={emp.id} style={{ background: '#fff' }}>
                      <td style={styles.td}><strong>{emp.name}</strong><div style={{ fontSize: 11, color: '#94a3b8' }}>{emp.email}</div></td>
                      <td style={styles.td}>{emp.department}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusPill, background: `${statusColor[emp.sheet_status] || '#94a3b8'}22`, color: statusColor[emp.sheet_status] || '#94a3b8' }}>
                          {statusLabel[emp.sheet_status] || 'Not Started'}
                        </span>
                      </td>
                      <td style={styles.td}>{emp.goal_count || 0}</td>
                      {['q1', 'q2', 'q3', 'q4'].map(q => (
                        <td key={q} style={styles.td}>
                          <span style={{ color: emp[`${q}_updates`] > 0 ? '#10b981' : '#d1d5db' }}>
                            {emp[`${q}_updates`] > 0 ? '✓' : '—'}
                          </span>
                        </td>
                      ))}
                      <td style={styles.td}>
                        {emp.sheet_status === 'submitted' && (
                          <button onClick={() => navigate('/team-goals')} style={styles.reviewBtn}>Review</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
      {sub && <div style={styles.statSub}>{sub}</div>}
    </div>
  );
}

function scoreColor(score) {
  if (!score) return '#e2e8f0';
  if (score >= 100) return '#d1fae5';
  if (score >= 75) return '#fef3c7';
  return '#fee2e2';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1200, margin: '0 auto' },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  greeting: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  quarterBadge: { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', padding: '12px 20px', borderRadius: 12, textAlign: 'center' },
  qLabel: { display: 'block', fontSize: 11, opacity: 0.8, letterSpacing: 1 },
  qValue: { display: 'block', fontSize: 22, fontWeight: 800, marginTop: 2 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 14, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  statSub: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  section: { background: '#fff', borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' },
  actionBtn: { padding: '8px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  primaryBtn: { padding: '12px 24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, marginTop: 12 },
  emptyState: { textAlign: 'center', padding: '40px 20px', color: '#94a3b8' },
  goalsList: { display: 'flex', flexDirection: 'column', gap: 10 },
  goalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8faff', borderRadius: 10, border: '1px solid #e0e7ff' },
  goalInfo: { display: 'flex', alignItems: 'center', gap: 10, flex: 1 },
  thrustBadge: { background: '#ede9fe', color: '#7c3aed', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },
  goalTitle: { fontSize: 13.5, fontWeight: 500, color: '#1e293b' },
  sharedBadge: { background: '#fef3c7', color: '#d97706', padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700 },
  goalMeta: { display: 'flex', alignItems: 'center', gap: 8 },
  metaItem: { fontSize: 11, color: '#94a3b8' },
  weightBadge: { background: '#667eea', color: '#fff', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8faff', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#374151', verticalAlign: 'middle' },
  scoreBadge: { padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'inline-block' },
  statusPill: { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  reviewBtn: { padding: '5px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }
};
