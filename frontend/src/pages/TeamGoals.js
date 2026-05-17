import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function TeamGoals() {
  const { user } = useAuth();
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [goalEdits, setGoalEdits] = useState({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/goals/cycles').then(r => {
      const active = r.data.find(c => c.is_active) || r.data[0];
      setCycles(r.data);
      setActiveCycle(active);
    });
  }, []);

  useEffect(() => {
    if (!activeCycle) return;
    api.get(`/goals/team-sheets/${activeCycle.id}`).then(r => setSheets(r.data));
  }, [activeCycle]);

  const reload = () => {
    if (!activeCycle) return;
    api.get(`/goals/team-sheets/${activeCycle.id}`).then(r => {
      setSheets(r.data);
      if (selected) {
        const updated = r.data.find(s => s.id === selected.id);
        if (updated) setSelected(updated);
      }
    });
  };

  const approve = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const edits = Object.entries(goalEdits).map(([id, vals]) => ({ id: parseInt(id), ...vals }));
      await api.post(`/goals/sheet/${selected.id}/approve`, { comment, goal_edits: edits });
      toast.success('Goal sheet approved and locked!');
      setSelected(null);
      setComment('');
      setGoalEdits({});
      reload();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Approval failed');
    } finally { setLoading(false); }
  };

  const returnSheet = async () => {
    if (!comment.trim()) { toast.error('Add a comment explaining why you are returning this sheet'); return; }
    setLoading(true);
    try {
      await api.post(`/goals/sheet/${selected.id}/return`, { comment });
      toast.success('Sheet returned to employee');
      setSelected(null);
      setComment('');
      reload();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Return failed');
    } finally { setLoading(false); }
  };

  const unlock = async (sheet) => {
    const reason = prompt('Reason for unlocking this sheet:');
    if (!reason) return;
    try {
      await api.post(`/goals/sheet/${sheet.id}/unlock`, { reason });
      toast.success('Sheet unlocked for employee');
      reload();
    } catch (e) { toast.error(e.response?.data?.error || 'Unlock failed'); }
  };

  const statusColor = { draft: '#f59e0b', submitted: '#3b82f6', returned: '#ef4444', locked: '#10b981', approved: '#10b981' };
  const filteredSheets = filter === 'all' ? sheets : sheets.filter(s => s.status === filter);

  const updateGoalEdit = (goalId, field, val) => {
    setGoalEdits(prev => ({ ...prev, [goalId]: { ...prev[goalId], [field]: val } }));
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👥 {user.role === 'admin' ? 'All Goal Sheets' : 'Team Goals'}</h1>
          <p style={styles.sub}>{activeCycle?.name}</p>
        </div>
        <div style={styles.filters}>
          {['all', 'submitted', 'locked', 'draft', 'returned'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, background: filter === f ? '#667eea' : '#f1f5f9', color: filter === f ? '#fff' : '#64748b' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? sheets.length : sheets.filter(s => s.status === f).length})
            </button>
          ))}
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.list}>
          {filteredSheets.length === 0 ? (
            <div style={styles.empty}>No sheets found</div>
          ) : filteredSheets.map(sheet => (
            <div key={sheet.id} onClick={() => { setSelected(sheet); setComment(''); setGoalEdits({}); }}
              style={{ ...styles.sheetCard, border: selected?.id === sheet.id ? '2px solid #667eea' : '1px solid #e2e8f0' }}>
              <div style={styles.sheetTop}>
                <div>
                  <div style={styles.empName}>{sheet.employee_name}</div>
                  <div style={styles.empDept}>{sheet.department} · {sheet.employee_email}</div>
                </div>
                <span style={{ ...styles.statusDot, background: statusColor[sheet.status] || '#94a3b8' }} />
              </div>
              <div style={styles.sheetMeta}>
                <span style={{ ...styles.statusPill, background: `${statusColor[sheet.status]}22`, color: statusColor[sheet.status] }}>
                  {sheet.status?.toUpperCase()}
                </span>
                <span style={styles.goalCount}>{sheet.goals?.length || 0} goals</span>
                {sheet.submitted_at && <span style={styles.dateTag}>📅 {new Date(sheet.submitted_at).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>

        {selected ? (
          <div style={styles.detail}>
            <div style={styles.detailHeader}>
              <div>
                <h2 style={styles.detailName}>{selected.employee_name}</h2>
                <p style={styles.detailSub}>{selected.department} · {selected.employee_email}</p>
              </div>
              {user.role === 'admin' && selected.status === 'locked' && (
                <button onClick={() => unlock(selected)} style={styles.unlockBtn}>🔓 Unlock</button>
              )}
            </div>

            <div style={styles.goalsTable}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Thrust Area</th>
                    <th style={styles.th}>Goal Title</th>
                    <th style={styles.th}>UoM</th>
                    <th style={styles.th}>Target</th>
                    <th style={styles.th}>Weightage %</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.goals?.map(goal => (
                    <tr key={goal.id}>
                      <td style={styles.td}><span style={styles.thrustBadge}>{goal.thrust_area}</span></td>
                      <td style={styles.td}>{goal.title}{goal.is_shared ? <span style={styles.sharedTag}>Shared</span> : null}</td>
                      <td style={styles.td}><span style={styles.uomTag}>{goal.uom_type}</span></td>
                      <td style={styles.td}>
                        {selected.status === 'submitted' ? (
                          <input type="number" defaultValue={goal.target_value || ''} onChange={e => updateGoalEdit(goal.id, 'target_value', parseFloat(e.target.value))}
                            style={styles.inlineInput} placeholder={goal.target_value || 'N/A'} />
                        ) : (goal.target_value || goal.target_date || '—')}
                      </td>
                      <td style={styles.td}>
                        {selected.status === 'submitted' ? (
                          <input type="number" defaultValue={goal.weightage} onChange={e => updateGoalEdit(goal.id, 'weightage', parseFloat(e.target.value))}
                            style={{ ...styles.inlineInput, width: 70 }} />
                        ) : <strong>{goal.weightage}%</strong>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>Total Weightage:</td>
                    <td style={{ ...styles.td, fontWeight: 800, color: selected.goals?.reduce((s, g) => s + g.weightage, 0) === 100 ? '#10b981' : '#ef4444' }}>
                      {selected.goals?.reduce((s, g) => s + g.weightage, 0)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selected.status === 'submitted' && (
              <div style={styles.actionPanel}>
                <label style={styles.label}>Comment (required for return, optional for approval)</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} style={styles.textarea}
                  placeholder="Add your feedback or approval note..." />
                <div style={styles.actionBtns}>
                  <button onClick={returnSheet} disabled={loading} style={styles.returnBtn}>↩️ Return for Rework</button>
                  <button onClick={approve} disabled={loading} style={styles.approveBtn}>✅ Approve & Lock</button>
                </div>
              </div>
            )}

            {selected.manager_comment && (
              <div style={styles.commentBox}>
                <strong>Manager Note:</strong> {selected.manager_comment}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.placeholder}>
            <div style={{ fontSize: 40 }}>👈</div>
            <p>Select a goal sheet to review</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  filters: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  layout: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 },
  list: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' },
  sheetCard: { background: '#fff', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.15s' },
  sheetTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  empName: { fontWeight: 700, color: '#1e293b', fontSize: 14 },
  empDept: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  sheetMeta: { display: 'flex', alignItems: 'center', gap: 8 },
  statusPill: { padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 },
  goalCount: { fontSize: 11, color: '#94a3b8' },
  dateTag: { fontSize: 10, color: '#94a3b8', marginLeft: 'auto' },
  empty: { textAlign: 'center', color: '#94a3b8', padding: 40 },
  detail: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: 'fit-content' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  detailName: { margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' },
  detailSub: { margin: '4px 0 0', color: '#64748b', fontSize: 13 },
  unlockBtn: { padding: '8px 16px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  goalsTable: { overflowX: 'auto', marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f8faff', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  thrustBadge: { background: '#ede9fe', color: '#7c3aed', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  sharedTag: { background: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: 4, fontSize: 10, marginLeft: 6 },
  uomTag: { background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontSize: 11 },
  inlineInput: { padding: '6px 10px', border: '1.5px solid #667eea', borderRadius: 6, fontSize: 12, width: 100 },
  actionPanel: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151' },
  textarea: { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, minHeight: 80, resize: 'vertical', outline: 'none' },
  actionBtns: { display: 'flex', gap: 12 },
  returnBtn: { flex: 1, padding: '12px', background: '#fff', border: '1.5px solid #ef4444', color: '#ef4444', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  approveBtn: { flex: 1, padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  commentBox: { background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#374151', marginTop: 16 },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#94a3b8', gap: 8 }
};
