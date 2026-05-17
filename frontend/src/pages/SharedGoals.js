import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const UOM_TYPES = [
  { value: 'numeric_min', label: 'Numeric (Higher is Better)' },
  { value: 'numeric_max', label: 'Numeric (Lower is Better)' },
  { value: 'timeline', label: 'Timeline (Date-based)' },
  { value: 'zero', label: 'Zero-based' }
];

const THRUST_AREAS = ['Revenue Growth', 'Cost Optimization', 'Quality Improvement', 'Customer Satisfaction', 'Innovation', 'Team Development', 'Operational Excellence', 'Compliance & Safety'];

export default function SharedGoals() {
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ thrust_area: '', title: '', description: '', uom_type: 'numeric_min', target_value: '', target_date: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/goals/cycles').then(r => {
      const active = r.data.find(c => c.is_active) || r.data[0];
      setCycles(r.data);
      setActiveCycle(active);
    });
    api.get('/reports/users').then(r => setEmployees(r.data.filter(u => u.role === 'employee'))).catch(() => {
      // fallback: try getting team sheets if users endpoint fails
      setEmployees([]);
    });
  }, []);

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelected(employees.map(e => e.id));
  const clearAll = () => setSelected([]);

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Goal title is required');
    if (!form.thrust_area) return toast.error('Thrust area is required');
    if (selected.length === 0) return toast.error('Select at least one employee');
    setLoading(true);
    try {
      await api.post('/goals/shared-goal', { cycle_id: activeCycle.id, employee_ids: selected, ...form, target_value: form.target_value ? parseFloat(form.target_value) : null });
      toast.success(`Shared goal pushed to ${selected.length} employees!`);
      setForm({ thrust_area: '', title: '', description: '', uom_type: 'numeric_min', target_value: '', target_date: '' });
      setSelected([]);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to push shared goal');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔗 Push Shared Goals</h1>
        <p style={styles.sub}>Push a department-level KPI to multiple employees — they can only adjust weightage</p>
      </div>

      <div style={styles.layout}>
        <div style={styles.formCard}>
          <h3 style={styles.cardTitle}>Shared Goal Details</h3>
          <div style={styles.fields}>
            <div style={styles.field}>
              <label style={styles.label}>Thrust Area *</label>
              <select value={form.thrust_area} onChange={e => setForm(p => ({ ...p, thrust_area: e.target.value }))} style={styles.select}>
                <option value="">Select...</option>
                {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Goal Title *</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={styles.input} placeholder="e.g. Achieve zero safety incidents" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ ...styles.input, height: 70, resize: 'vertical' }} placeholder="Describe this KPI..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>UoM Type *</label>
              <select value={form.uom_type} onChange={e => setForm(p => ({ ...p, uom_type: e.target.value }))} style={styles.select}>
                {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            {form.uom_type !== 'zero' && form.uom_type !== 'timeline' && (
              <div style={styles.field}>
                <label style={styles.label}>Target Value</label>
                <input type="number" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))} style={styles.input} placeholder="Enter target number" />
              </div>
            )}
            {form.uom_type === 'timeline' && (
              <div style={styles.field}>
                <label style={styles.label}>Target Date</label>
                <input type="date" value={form.target_date} onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))} style={styles.input} />
              </div>
            )}
          </div>
          <div style={styles.noteBox}>
            📌 Recipients will see this goal with a default 10% weightage. They can adjust the weightage but cannot edit the title or target.
          </div>
        </div>

        <div style={styles.employeeCard}>
          <div style={styles.empHeader}>
            <h3 style={styles.cardTitle}>Select Employees ({selected.length}/{employees.length})</h3>
            <div style={styles.empActions}>
              <button onClick={selectAll} style={styles.smallBtn}>Select All</button>
              <button onClick={clearAll} style={styles.smallBtn}>Clear</button>
            </div>
          </div>
          <div style={styles.empList}>
            {employees.map(emp => (
              <div key={emp.id} onClick={() => toggle(emp.id)} style={{ ...styles.empRow, background: selected.includes(emp.id) ? '#f0f4ff' : '#fff', border: selected.includes(emp.id) ? '1.5px solid #667eea' : '1px solid #e2e8f0' }}>
                <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => {}} style={{ cursor: 'pointer' }} />
                <div>
                  <div style={styles.empName}>{emp.name}</div>
                  <div style={styles.empDept}>{emp.department} · {emp.email}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={submit} disabled={loading} style={styles.submitBtn}>
            {loading ? 'Pushing...' : `🚀 Push to ${selected.length} Employee${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '6px 0 0', color: '#64748b', fontSize: 14 },
  layout: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 },
  formCard: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  employeeCard: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 12 },
  cardTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b' },
  fields: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151' },
  input: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' },
  select: { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' },
  noteBox: { marginTop: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#92400e' },
  empHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  empActions: { display: 'flex', gap: 8 },
  smallBtn: { padding: '5px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#64748b', fontWeight: 600 },
  empList: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' },
  empRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.1s' },
  empName: { fontWeight: 600, fontSize: 13, color: '#1e293b' },
  empDept: { fontSize: 11, color: '#94a3b8' },
  submitBtn: { padding: '13px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, marginTop: 4 }
};
