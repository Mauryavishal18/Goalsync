import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const STATUS_OPTIONS = ['not_started', 'on_track', 'completed'];

export default function QuarterlyUpdate() {
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [updates, setUpdates] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    api.get('/goals/cycles').then(r => {
      const list = Array.isArray(r.data) ? r.data : [];
      const active = list.find(c => c.is_active) || list[0] || null;
      setCycles(list);
      setActiveCycle(active);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeCycle) return;
    api.get(`/goals/my-sheet/${activeCycle.id}`).then(r => {
      setSheetData(r.data);
      const upd = {};
      (r.data.goals || []).forEach(goal => {
        (goal.updates || []).forEach(u => {
          if (!upd[u.quarter]) upd[u.quarter] = {};
          upd[u.quarter][goal.id] = {
            actual_value: u.actual_value || '',
            actual_date: u.actual_date || '',
            status: u.status || 'not_started',
            remark: u.employee_remark || ''
          };
        });
      });
      setUpdates(upd);
    }).catch(() => {});
  }, [activeCycle]);

  const setUpdate = (quarter, goalId, field, val) => {
    setUpdates(prev => ({
      ...prev,
      [quarter]: { ...(prev[quarter] || {}), [goalId]: { ...(prev[quarter]?.[goalId] || {}), [field]: val } }
    }));
  };

  const saveUpdate = async (goalId) => {
    setSaving(goalId);
    try {
      const upd = updates[activeQuarter]?.[goalId] || {};
      const res = await api.post('/goals/quarterly-update', {
        goal_id: goalId, quarter: activeQuarter,
        actual_value: upd.actual_value ? parseFloat(upd.actual_value) : null,
        actual_date: upd.actual_date || null,
        status: upd.status || 'not_started',
        remark: upd.remark || ''
      });
      toast.success(`Updated! Score: ${res.data.progress_score ? res.data.progress_score.toFixed(1) + '%' : 'Calculated'}`);
      const updated = await api.get(`/goals/my-sheet/${activeCycle.id}`);
      setSheetData(updated.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Update failed');
    } finally { setSaving(null); }
  };

  if (!sheetData) return <div style={styles.loading}>Loading...</div>;
  if (!sheetData.sheet) return (
    <div style={styles.page}>
      <div style={styles.noSheet}>
        <div style={{ fontSize: 48 }}>📋</div>
        <h2>No Approved Goal Sheet</h2>
        <p>Your goal sheet must be approved by your manager before you can log quarterly achievements.</p>
      </div>
    </div>
  );
  if (sheetData.sheet.status !== 'locked') return (
    <div style={styles.page}>
      <div style={styles.noSheet}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <h2>Awaiting Manager Approval</h2>
        <p>Your goal sheet is currently <strong>{sheetData.sheet.status}</strong>. Quarterly updates can only be logged after approval.</p>
      </div>
    </div>
  );

  const scoreColor = (s) => {
    if (!s) return '#94a3b8';
    if (s >= 100) return '#10b981';
    if (s >= 75) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Quarterly Updates</h1>
          <p style={styles.sub}>{activeCycle?.name} · Log your actual achievements</p>
        </div>
      </div>

      <div style={styles.quarterTabs}>
        {QUARTERS.map(q => {
          const hasUpdates = (sheetData.goals || []).some(g => (g.updates || []).find(u => u.quarter === q));
          return (
            <button key={q} onClick={() => setActiveQuarter(q)} style={{ ...styles.quarterTab, background: activeQuarter === q ? '#667eea' : '#fff', color: activeQuarter === q ? '#fff' : '#64748b', border: activeQuarter === q ? 'none' : '1px solid #e2e8f0' }}>
              {q} {hasUpdates ? '✓' : ''}
            </button>
          );
        })}
      </div>

      <div style={styles.goalsList}>
        {(sheetData.goals || []).map(goal => {
          const existingUpdate = (goal.updates || []).find(u => u.quarter === activeQuarter);
          const currentEdit = updates[activeQuarter]?.[goal.id] || {
            actual_value: existingUpdate?.actual_value || '',
            actual_date: existingUpdate?.actual_date || '',
            status: existingUpdate?.status || 'not_started',
            remark: existingUpdate?.employee_remark || ''
          };

          return (
            <div key={goal.id} style={styles.goalCard}>
              <div style={styles.goalTop}>
                <div style={styles.goalLeft}>
                  <span style={styles.thrustBadge}>{goal.thrust_area}</span>
                  <div style={styles.goalTitle}>{goal.title}</div>
                  <div style={styles.goalMeta}>
                    <span style={styles.uomTag}>{goal.uom_type}</span>
                    <span style={styles.weightTag}>{goal.weightage}% weight</span>
                    {goal.target_value && <span style={styles.targetTag}>Target: {goal.target_value}</span>}
                    {goal.target_date && <span style={styles.targetTag}>By: {goal.target_date}</span>}
                  </div>
                </div>
                {existingUpdate?.progress_score != null && (
                  <div style={styles.scoreCircle}>
                    <div style={{ ...styles.scoreValue, color: scoreColor(existingUpdate.progress_score) }}>
                      {existingUpdate.progress_score.toFixed(0)}%
                    </div>
                    <div style={styles.scoreLabel}>Score</div>
                  </div>
                )}
              </div>

              <div style={styles.updateForm}>
                <div style={styles.formRow}>
                  {goal.uom_type !== 'zero' && goal.uom_type !== 'timeline' && (
                    <div style={styles.field}>
                      <label style={styles.label}>Actual Achievement</label>
                      <input type="number" value={currentEdit.actual_value} onChange={e => setUpdate(activeQuarter, goal.id, 'actual_value', e.target.value)} style={styles.input} placeholder="Enter actual value" />
                    </div>
                  )}
                  {goal.uom_type === 'zero' && (
                    <div style={styles.field}>
                      <label style={styles.label}>Actual Incidents</label>
                      <input type="number" value={currentEdit.actual_value} onChange={e => setUpdate(activeQuarter, goal.id, 'actual_value', e.target.value)} style={styles.input} placeholder="0 = 100% score" />
                    </div>
                  )}
                  {goal.uom_type === 'timeline' && (
                    <div style={styles.field}>
                      <label style={styles.label}>Actual Completion Date</label>
                      <input type="date" value={currentEdit.actual_date} onChange={e => setUpdate(activeQuarter, goal.id, 'actual_date', e.target.value)} style={styles.input} />
                    </div>
                  )}
                  <div style={styles.field}>
                    <label style={styles.label}>Status</label>
                    <select value={currentEdit.status} onChange={e => setUpdate(activeQuarter, goal.id, 'status', e.target.value)} style={styles.select}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div style={{ ...styles.field, flex: 2 }}>
                    <label style={styles.label}>Remark</label>
                    <input value={currentEdit.remark} onChange={e => setUpdate(activeQuarter, goal.id, 'remark', e.target.value)} style={styles.input} placeholder="Add any notes..." />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>&nbsp;</label>
                    <button onClick={() => saveUpdate(goal.id)} disabled={saving === goal.id} style={styles.saveBtn}>
                      {saving === goal.id ? '...' : '💾 Save'}
                    </button>
                  </div>
                </div>
                {existingUpdate?.manager_comment && (
                  <div style={styles.managerComment}>
                    💬 Manager: "{existingUpdate.manager_comment}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 1000, margin: '0 auto' },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  header: { marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  noSheet: { textAlign: 'center', background: '#fff', borderRadius: 16, padding: '60px 40px', color: '#64748b' },
  quarterTabs: { display: 'flex', gap: 10, marginBottom: 20 },
  quarterTab: { padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15, transition: 'all 0.15s' },
  goalsList: { display: 'flex', flexDirection: 'column', gap: 14 },
  goalCard: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  goalTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  goalLeft: { flex: 1 },
  thrustBadge: { background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'inline-block', marginBottom: 6 },
  goalTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 },
  goalMeta: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  uomTag: { background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontSize: 11 },
  weightTag: { background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontSize: 11 },
  targetTag: { background: '#fafafa', color: '#64748b', padding: '2px 8px', borderRadius: 6, fontSize: 11 },
  scoreCircle: { textAlign: 'center', background: '#f8faff', border: '2px solid #e0e7ff', borderRadius: 12, padding: '10px 16px', minWidth: 70 },
  scoreValue: { fontSize: 22, fontWeight: 800 },
  scoreLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  updateForm: {},
  formRow: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 120 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' },
  select: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' },
  saveBtn: { padding: '9px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' },
  managerComment: { marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#166534' }
};
