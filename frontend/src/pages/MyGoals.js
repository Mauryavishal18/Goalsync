import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const UOM_TYPES = [
  { value: 'numeric_min', label: 'Numeric (Higher is Better)', desc: 'e.g. Sales Revenue, Units Sold' },
  { value: 'numeric_max', label: 'Numeric (Lower is Better)', desc: 'e.g. TAT, Cost, Defects' },
  { value: 'timeline', label: 'Timeline (Date-based)', desc: 'e.g. Project completion by date' },
  { value: 'zero', label: 'Zero-based', desc: 'e.g. Safety incidents (0 = 100%)' }
];

const THRUST_AREAS = ['Revenue Growth', 'Cost Optimization', 'Quality Improvement', 'Customer Satisfaction', 'Innovation', 'Team Development', 'Operational Excellence', 'Compliance & Safety'];

const emptyGoal = () => ({ thrust_area: '', title: '', description: '', uom_type: 'numeric_min', target_value: '', target_date: '', weightage: '' });

export default function MyGoals() {
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [goals, setGoals] = useState([emptyGoal()]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sheetId, setSheetId] = useState(null);

  useEffect(() => {
    api.get('/goals/cycles').then(r => {
      const active = r.data.find(c => c.is_active) || r.data[0];
      setCycles(r.data);
      setActiveCycle(active);
    });
  }, []);

  useEffect(() => {
    if (!activeCycle) return;
    api.get(`/goals/my-sheet/${activeCycle.id}`).then(r => {
      setSheetData(r.data);
      if (r.data.goals?.length > 0) {
        setGoals(r.data.goals.map(g => ({
          id: g.id, thrust_area: g.thrust_area, title: g.title, description: g.description,
          uom_type: g.uom_type, target_value: g.target_value || '', target_date: g.target_date || '', weightage: g.weightage
        })));
        setSheetId(r.data.sheet?.id);
      }
    });
  }, [activeCycle]);

  const totalWeight = goals.reduce((s, g) => s + (parseFloat(g.weightage) || 0), 0);
  const isLocked = ['locked', 'submitted'].includes(sheetData?.sheet?.status);

  const updateGoal = (i, field, val) => {
    setGoals(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: val } : g));
  };

  const addGoal = () => {
    if (goals.length >= 8) return toast.error('Maximum 8 goals allowed');
    setGoals(prev => [...prev, emptyGoal()]);
  };

  const removeGoal = (i) => {
    if (goals.length === 1) return toast.error('At least 1 goal required');
    setGoals(prev => prev.filter((_, idx) => idx !== i));
  };

  const distribute = () => {
    const each = parseFloat((100 / goals.length).toFixed(1));
    const adjusted = goals.map((g, i) => ({ ...g, weightage: i === goals.length - 1 ? (100 - each * (goals.length - 1)) : each }));
    setGoals(adjusted);
  };

  const validate = () => {
    if (goals.length > 8) return 'Maximum 8 goals allowed';
    if (goals.some(g => !g.title.trim())) return 'All goals must have a title';
    if (goals.some(g => !g.thrust_area)) return 'All goals must have a Thrust Area';
    if (goals.some(g => !g.uom_type)) return 'All goals must have a UoM type';
    if (goals.some(g => parseFloat(g.weightage) < 10)) return 'Minimum weightage per goal is 10%';
    if (Math.abs(totalWeight - 100) > 0.01) return `Total weightage must be 100%. Currently: ${totalWeight.toFixed(1)}%`;
    return null;
  };

  const saveDraft = async () => {
    const err = validate();
    if (err) return toast.error(err);
    setSaving(true);
    try {
      const res = await api.post('/goals/sheet', { cycle_id: activeCycle.id, goals });
      setSheetId(res.data.sheet_id);
      toast.success('Draft saved!');
      // Reload
      const updated = await api.get(`/goals/my-sheet/${activeCycle.id}`);
      setSheetData(updated.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const submitSheet = async () => {
    const err = validate();
    if (err) return toast.error(err);
    if (!sheetId) { toast.error('Save draft first'); return; }
    if (!window.confirm('Submit goal sheet for manager approval? You cannot edit after submission.')) return;
    setSubmitting(true);
    try {
      await api.post(`/goals/sheet/${sheetId}/submit`);
      toast.success('Goal sheet submitted for approval!');
      const updated = await api.get(`/goals/my-sheet/${activeCycle.id}`);
      setSheetData(updated.data);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const statusInfo = sheetData?.sheet?.status;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🎯 My Goals</h1>
          <p style={styles.sub}>{activeCycle?.name}</p>
        </div>
        <div style={styles.headerRight}>
          {statusInfo && (
            <span style={{ ...styles.statusChip, ...statusChipStyle(statusInfo) }}>
              {statusLabel(statusInfo)}
            </span>
          )}
          {sheetData?.sheet?.manager_comment && (
            <div style={styles.managerNote}>
              💬 Manager: "{sheetData.sheet.manager_comment}"
            </div>
          )}
        </div>
      </div>

      <div style={styles.weightBar}>
        <div style={styles.weightBarInner}>
          <div style={{ ...styles.weightFill, width: `${Math.min(totalWeight, 100)}%`, background: totalWeight === 100 ? '#10b981' : totalWeight > 100 ? '#ef4444' : '#f59e0b' }} />
        </div>
        <span style={{ ...styles.weightText, color: totalWeight === 100 ? '#10b981' : totalWeight > 100 ? '#ef4444' : '#f59e0b' }}>
          {totalWeight.toFixed(1)}% / 100%
        </span>
        {!isLocked && <button onClick={distribute} style={styles.distributeBtn}>Auto-distribute</button>}
      </div>

      {!isLocked && (
        <div style={styles.rules}>
          <span>📌 Rules: Max 8 goals · Min 10% per goal · Total must = 100%</span>
          <span style={{ color: goals.length >= 8 ? '#ef4444' : '#94a3b8' }}>{goals.length}/8 goals</span>
        </div>
      )}

      <div style={styles.goalsContainer}>
        {goals.map((goal, i) => (
          <div key={i} style={{ ...styles.goalCard, borderLeft: goal.is_shared ? '4px solid #f59e0b' : '4px solid #667eea' }}>
            <div style={styles.goalCardHeader}>
              <span style={styles.goalNum}>Goal {i + 1}</span>
              {goal.is_shared && <span style={styles.sharedTag}>🔗 Shared Goal</span>}
              {!isLocked && !goal.is_shared && (
                <button onClick={() => removeGoal(i)} style={styles.removeBtn}>✕ Remove</button>
              )}
            </div>

            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Thrust Area *</label>
                {!isLocked && !goal.is_shared ? (
                  <select value={goal.thrust_area} onChange={e => updateGoal(i, 'thrust_area', e.target.value)} style={styles.select}>
                    <option value="">Select thrust area...</option>
                    {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                ) : <div style={styles.readOnly}>{goal.thrust_area}</div>}
              </div>

              <div style={{ ...styles.field, gridColumn: 'span 2' }}>
                <label style={styles.label}>Goal Title *</label>
                {!isLocked && !goal.is_shared ? (
                  <input value={goal.title} onChange={e => updateGoal(i, 'title', e.target.value)} style={styles.input} placeholder="e.g. Increase quarterly sales by 20%" />
                ) : <div style={styles.readOnly}>{goal.title}</div>}
              </div>

              <div style={{ ...styles.field, gridColumn: 'span 3' }}>
                <label style={styles.label}>Description</label>
                {!isLocked ? (
                  <textarea value={goal.description} onChange={e => updateGoal(i, 'description', e.target.value)} style={{ ...styles.input, height: 60, resize: 'vertical' }} placeholder="Describe this goal..." />
                ) : <div style={styles.readOnly}>{goal.description || '—'}</div>}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>UoM Type *</label>
                {!isLocked && !goal.is_shared ? (
                  <select value={goal.uom_type} onChange={e => updateGoal(i, 'uom_type', e.target.value)} style={styles.select}>
                    {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                ) : <div style={styles.readOnly}>{UOM_TYPES.find(u => u.value === goal.uom_type)?.label}</div>}
                <span style={styles.helper}>{UOM_TYPES.find(u => u.value === goal.uom_type)?.desc}</span>
              </div>

              {goal.uom_type === 'timeline' ? (
                <div style={styles.field}>
                  <label style={styles.label}>Target Date *</label>
                  {!isLocked && !goal.is_shared ? (
                    <input type="date" value={goal.target_date} onChange={e => updateGoal(i, 'target_date', e.target.value)} style={styles.input} />
                  ) : <div style={styles.readOnly}>{goal.target_date || '—'}</div>}
                </div>
              ) : goal.uom_type !== 'zero' ? (
                <div style={styles.field}>
                  <label style={styles.label}>Target Value *</label>
                  {!isLocked && !goal.is_shared ? (
                    <input type="number" value={goal.target_value} onChange={e => updateGoal(i, 'target_value', e.target.value)} style={styles.input} placeholder="Enter target" />
                  ) : <div style={styles.readOnly}>{goal.target_value || '—'}</div>}
                </div>
              ) : <div style={styles.field}><div style={{ ...styles.readOnly, background: '#f0fdf4', color: '#16a34a' }}>Target: 0 (zero incidents)</div></div>}

              <div style={styles.field}>
                <label style={styles.label}>Weightage % * <span style={{ color: '#94a3b8', fontWeight: 400 }}>(min 10%)</span></label>
                {!isLocked ? (
                  <input type="number" min="10" max="100" value={goal.weightage} onChange={e => updateGoal(i, 'weightage', e.target.value)} style={{ ...styles.input, borderColor: parseFloat(goal.weightage) < 10 ? '#ef4444' : '#e2e8f0' }} placeholder="e.g. 25" />
                ) : <div style={styles.readOnly}>{goal.weightage}%</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLocked && (
        <div style={styles.addSection}>
          <button onClick={addGoal} disabled={goals.length >= 8} style={styles.addBtn}>
            + Add Goal {goals.length >= 8 ? '(Max reached)' : `(${8 - goals.length} remaining)`}
          </button>
        </div>
      )}

      {!isLocked && (
        <div style={styles.actions}>
          <button onClick={saveDraft} disabled={saving} style={styles.draftBtn}>
            {saving ? 'Saving...' : '💾 Save Draft'}
          </button>
          <button onClick={submitSheet} disabled={submitting || !sheetId} style={styles.submitBtn}>
            {submitting ? 'Submitting...' : '📤 Submit for Approval'}
          </button>
        </div>
      )}

      {statusInfo === 'locked' && (
        <div style={styles.lockedBanner}>
          🔒 Your goal sheet is approved and locked. Contact Admin to make any changes after approval.
        </div>
      )}
    </div>
  );
}

const statusLabel = (s) => ({ draft: '📝 Draft', submitted: '⏳ Awaiting Approval', returned: '↩️ Returned', locked: '✅ Approved & Locked', approved: '✅ Approved' }[s] || s);
const statusChipStyle = (s) => ({
  draft: { background: '#fef3c7', color: '#92400e' },
  submitted: { background: '#dbeafe', color: '#1e40af' },
  returned: { background: '#fee2e2', color: '#991b1b' },
  locked: { background: '#d1fae5', color: '#065f46' },
  approved: { background: '#d1fae5', color: '#065f46' },
}[s] || {});

const styles = {
  page: { padding: '28px 32px', maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  headerRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  statusChip: { padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 },
  managerNote: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 12px', fontSize: 12, maxWidth: 280 },
  weightBar: { background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  weightBarInner: { flex: 1, height: 10, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden' },
  weightFill: { height: '100%', borderRadius: 10, transition: 'width 0.3s' },
  weightText: { fontWeight: 700, fontSize: 15, minWidth: 80 },
  distributeBtn: { padding: '6px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  rules: { background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#64748b', marginBottom: 20, display: 'flex', justifyContent: 'space-between' },
  goalsContainer: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 },
  goalCard: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  goalCardHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
  goalNum: { fontWeight: 700, color: '#1e293b', fontSize: 15 },
  sharedTag: { background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  removeBtn: { marginLeft: 'auto', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fafafa' },
  select: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fafafa' },
  readOnly: { padding: '9px 12px', background: '#f8faff', borderRadius: 8, fontSize: 13, color: '#374151', border: '1px solid #e0e7ff' },
  helper: { fontSize: 10, color: '#94a3b8' },
  addSection: { marginBottom: 20 },
  addBtn: { width: '100%', padding: '13px', border: '2px dashed #c7d2fe', background: '#f8faff', color: '#667eea', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  actions: { display: 'flex', gap: 12, marginBottom: 20 },
  draftBtn: { padding: '12px 24px', background: '#f1f5f9', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  submitBtn: { padding: '12px 28px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  lockedBanner: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 20px', color: '#166534', fontSize: 14, fontWeight: 500 }
};
