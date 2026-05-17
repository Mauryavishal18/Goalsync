import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function Checkins() {
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeQ, setActiveQ] = useState('Q1');
  const [comments, setComments] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api.get('/goals/cycles').then(r => {
      const active = r.data.find(c => c.is_active) || r.data[0];
      setCycles(r.data);
      setActiveCycle(active);
    });
  }, []);

  useEffect(() => {
    if (!activeCycle) return;
    api.get(`/goals/team-sheets/${activeCycle.id}`).then(r => {
      const approved = r.data.filter(s => s.status === 'locked');
      setSheets(approved);
    });
  }, [activeCycle]);

  const saveComment = async (goalId) => {
    const comment = comments[`${activeQ}_${goalId}`];
    if (!comment?.trim()) return toast.error('Add a comment first');
    setSaving(`${activeQ}_${goalId}`);
    try {
      await api.post('/goals/checkin-comment', { goal_id: goalId, quarter: activeQ, comment });
      toast.success('Check-in comment saved!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(null); }
  };

  const scoreColor = (s) => { if (!s) return '#94a3b8'; if (s >= 100) return '#10b981'; if (s >= 75) return '#f59e0b'; return '#ef4444'; };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>✅ Quarterly Check-ins</h1>
        <p style={styles.sub}>Review team progress and add structured check-in comments</p>
      </div>

      <div style={styles.layout}>
        <div style={styles.list}>
          <h3 style={styles.listTitle}>Approved Team Members ({sheets.length})</h3>
          {sheets.length === 0 && <div style={styles.empty}>No approved sheets yet</div>}
          {sheets.map(s => (
            <div key={s.id} onClick={() => setSelected(s)} style={{ ...styles.empCard, border: selected?.id === s.id ? '2px solid #667eea' : '1px solid #e2e8f0' }}>
              <div style={styles.empName}>{s.employee_name}</div>
              <div style={styles.empMeta}>{s.department} · {s.goals?.length || 0} goals</div>
            </div>
          ))}
        </div>

        {selected ? (
          <div style={styles.detail}>
            <div style={styles.detailTop}>
              <div>
                <h2 style={styles.detailName}>{selected.employee_name}</h2>
                <p style={styles.detailSub}>{selected.department}</p>
              </div>
              <div style={styles.quarterTabs}>
                {QUARTERS.map(q => (
                  <button key={q} onClick={() => setActiveQ(q)} style={{ ...styles.qTab, background: activeQ === q ? '#667eea' : '#f1f5f9', color: activeQ === q ? '#fff' : '#64748b' }}>{q}</button>
                ))}
              </div>
            </div>

            <div style={styles.goalsList}>
              {selected.goals?.map(goal => {
                const update = goal.updates?.find ? goal.updates.find(u => u.quarter === activeQ) : null;
                const key = `${activeQ}_${goal.id}`;
                return (
                  <div key={goal.id} style={styles.goalCard}>
                    <div style={styles.goalHeader}>
                      <div>
                        <span style={styles.thrustBadge}>{goal.thrust_area}</span>
                        <div style={styles.goalTitle}>{goal.title}</div>
                        <div style={styles.goalMeta}>
                          <span style={styles.metaChip}>{goal.uom_type}</span>
                          <span style={styles.metaChip}>{goal.weightage}%</span>
                          {goal.target_value && <span style={styles.metaChip}>Target: {goal.target_value}</span>}
                        </div>
                      </div>
                      {update?.progress_score != null ? (
                        <div style={{ ...styles.scoreBadge, background: `${scoreColor(update.progress_score)}22`, color: scoreColor(update.progress_score) }}>
                          {update.progress_score.toFixed(1)}%
                        </div>
                      ) : <div style={styles.noUpdate}>No update yet</div>}
                    </div>

                    {update ? (
                      <div style={styles.updateInfo}>
                        <div style={styles.updateRow}>
                          <span style={styles.updateLabel}>Actual:</span>
                          <span style={styles.updateVal}>{update.actual_value ?? update.actual_date ?? '—'}</span>
                          <span style={styles.updateLabel}>Status:</span>
                          <span style={{ ...styles.statusChip, background: update.status === 'completed' ? '#d1fae5' : update.status === 'on_track' ? '#dbeafe' : '#f3f4f6', color: update.status === 'completed' ? '#065f46' : update.status === 'on_track' ? '#1d4ed8' : '#6b7280' }}>
                            {update.status?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {update.employee_remark && <div style={styles.empRemark}>💬 Employee: "{update.employee_remark}"</div>}
                        {update.manager_comment && <div style={styles.savedComment}>✅ Your comment: "{update.manager_comment}"</div>}
                      </div>
                    ) : <div style={styles.noUpdateMsg}>Employee has not logged achievement for {activeQ} yet.</div>}

                    <div style={styles.commentSection}>
                      <label style={styles.commentLabel}>Add Check-in Comment for {activeQ}</label>
                      <textarea value={comments[key] || update?.manager_comment || ''} onChange={e => setComments(p => ({ ...p, [key]: e.target.value }))} style={styles.textarea} placeholder="Document your check-in discussion..." />
                      <button onClick={() => saveComment(goal.id)} disabled={saving === key} style={styles.saveBtn}>
                        {saving === key ? 'Saving...' : '💬 Save Check-in Comment'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={styles.placeholder}>
            <div style={{ fontSize: 40 }}>👈</div>
            <p>Select a team member to conduct check-in</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  listTitle: { margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { color: '#94a3b8', fontSize: 13, padding: '20px 0' },
  empCard: { background: '#fff', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.1s' },
  empName: { fontWeight: 700, fontSize: 14, color: '#1e293b' },
  empMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  detail: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  detailTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  detailName: { margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' },
  detailSub: { margin: '4px 0 0', color: '#64748b', fontSize: 13 },
  quarterTabs: { display: 'flex', gap: 8 },
  qTab: { padding: '8px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  goalsList: { display: 'flex', flexDirection: 'column', gap: 16 },
  goalCard: { background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 12, padding: 16 },
  goalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  thrustBadge: { background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'inline-block', marginBottom: 4 },
  goalTitle: { fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 6 },
  goalMeta: { display: 'flex', gap: 6 },
  metaChip: { background: '#fff', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 6, fontSize: 10, color: '#64748b' },
  scoreBadge: { padding: '8px 14px', borderRadius: 10, fontWeight: 800, fontSize: 18, whiteSpace: 'nowrap' },
  noUpdate: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  updateInfo: { background: '#fff', borderRadius: 8, padding: '10px 12px', marginBottom: 12 },
  updateRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  updateLabel: { fontSize: 12, color: '#64748b', fontWeight: 600 },
  updateVal: { fontSize: 13, fontWeight: 700, color: '#1e293b' },
  statusChip: { padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  empRemark: { marginTop: 8, fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  savedComment: { marginTop: 6, fontSize: 12, color: '#16a34a', background: '#f0fdf4', padding: '6px 10px', borderRadius: 6 },
  noUpdateMsg: { background: '#fff', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  commentSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  commentLabel: { fontSize: 12, fontWeight: 600, color: '#374151' },
  textarea: { padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, minHeight: 70, resize: 'vertical', outline: 'none' },
  saveBtn: { alignSelf: 'flex-start', padding: '8px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 14, color: '#94a3b8', gap: 8, padding: 40 }
};
