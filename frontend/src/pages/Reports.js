import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Reports() {
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/goals/cycles').then(r => {
      const active = r.data.find(c => c.is_active) || r.data[0];
      setCycles(r.data);
      setActiveCycle(active);
    });
  }, []);

  useEffect(() => {
    if (!activeCycle) return;
    setLoading(true);
    api.get(`/reports/completion/${activeCycle.id}`)
      .then(r => setCompletion(r.data))
      .finally(() => setLoading(false));
  }, [activeCycle]);

  const exportCSV = () => {
    const url = `/api/reports/achievement/${activeCycle.id}?format=csv`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `achievement_report_${activeCycle.name}.csv`;
    link.click();
    toast.success('CSV download started!');
  };

  const statusColor = { draft: '#f59e0b', submitted: '#3b82f6', returned: '#ef4444', locked: '#10b981', approved: '#10b981' };
  const statusLabel = { draft: 'Draft', submitted: 'Pending', returned: 'Returned', locked: 'Approved', approved: 'Approved' };

  if (loading) return <div style={styles.loading}>Loading reports...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📈 Reports</h1>
          <p style={styles.sub}>{activeCycle?.name}</p>
        </div>
        <div style={styles.headerActions}>
          <select value={activeCycle?.id} onChange={e => setCycles(prev => { const c = cycles.find(x => x.id === parseInt(e.target.value)); setActiveCycle(c); return prev; })} style={styles.cycleSelect}>
            {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={exportCSV} style={styles.exportBtn}>⬇️ Export CSV</button>
        </div>
      </div>

      {completion && (
        <>
          <div style={styles.summaryCards}>
            {[
              { label: 'Total Employees', value: completion.summary.total_employees, color: '#667eea', icon: '👥' },
              { label: 'Goal Sheets Approved', value: completion.summary.approved, color: '#10b981', icon: '✅' },
              { label: 'Pending Review', value: completion.summary.submitted, color: '#3b82f6', icon: '⏳' },
              { label: 'Not Started', value: completion.summary.not_started, color: '#f59e0b', icon: '⚠️' },
            ].map(c => (
              <div key={c.label} style={{ ...styles.summaryCard, borderTop: `3px solid ${c.color}` }}>
                <div style={styles.cardIcon}>{c.icon}</div>
                <div style={{ ...styles.cardValue, color: c.color }}>{c.value}</div>
                <div style={styles.cardLabel}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Completion Dashboard</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Dept</th>
                    <th style={styles.th}>Manager</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Goals</th>
                    <th style={styles.th}>Q1</th>
                    <th style={styles.th}>Q2</th>
                    <th style={styles.th}>Q3</th>
                    <th style={styles.th}>Q4</th>
                    <th style={styles.th}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {completion.employees?.map(emp => (
                    <tr key={emp.id} style={{ background: '#fff' }}>
                      <td style={styles.td}>
                        <div style={styles.empName}>{emp.name}</div>
                        <div style={styles.empEmail}>{emp.email}</div>
                      </td>
                      <td style={styles.td}>{emp.department}</td>
                      <td style={styles.td}>{emp.manager_name || '—'}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.statusPill, background: `${statusColor[emp.sheet_status] || '#94a3b8'}22`, color: statusColor[emp.sheet_status] || '#94a3b8' }}>
                          {statusLabel[emp.sheet_status] || 'Not Started'}
                        </span>
                      </td>
                      <td style={styles.td}>{emp.goal_count || 0}</td>
                      {['q1','q2','q3','q4'].map(q => (
                        <td key={q} style={{ ...styles.td, textAlign: 'center' }}>
                          {emp[`${q}_updates`] > 0
                            ? <span style={styles.checkMark}>✓</span>
                            : <span style={styles.dash}>—</span>}
                        </td>
                      ))}
                      <td style={styles.td}>{emp.submitted_at ? new Date(emp.submitted_at).toLocaleDateString('en-IN') : '—'}</td>
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

const styles = {
  page: { padding: '28px 32px' },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  headerActions: { display: 'flex', gap: 12, alignItems: 'center' },
  cycleSelect: { padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 },
  exportBtn: { padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  summaryCards: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 },
  summaryCard: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardIcon: { fontSize: 24, marginBottom: 8 },
  cardValue: { fontSize: 28, fontWeight: 800 },
  cardLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  section: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  sectionTitle: { margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: '#1e293b' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8faff', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  empName: { fontWeight: 600, color: '#1e293b' },
  empEmail: { fontSize: 11, color: '#94a3b8' },
  statusPill: { padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  checkMark: { color: '#10b981', fontWeight: 700, fontSize: 16 },
  dash: { color: '#d1d5db' }
};
