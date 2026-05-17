import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/reports/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const roleColor = { employee: '#10b981', manager: '#3b82f6', admin: '#8b5cf6' };
  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👤 User Management</h1>
          <p style={styles.sub}>{users.length} total users in the system</p>
        </div>
        <div style={styles.filters}>
          {['all', 'employee', 'manager', 'admin'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, background: filter === f ? '#667eea' : '#f1f5f9', color: filter === f ? '#fff' : '#64748b' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? users.length : users.filter(u => u.role === f).length})
            </button>
          ))}
        </div>
      </div>

      <div style={styles.tableCard}>
        {loading ? <div style={styles.loading}>Loading users...</div> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Reports To</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={styles.td}>
                    <div style={styles.nameCell}>
                      <div style={{ ...styles.avatar, background: roleColor[u.role] }}>{u.name?.[0]}</div>
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.roleBadge, background: `${roleColor[u.role]}22`, color: roleColor[u.role] }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>{u.department || '—'}</td>
                  <td style={styles.td}>{u.manager_name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.credCard}>
        <h3 style={styles.credTitle}>🔑 Default Demo Credentials</h3>
        <div style={styles.credGrid}>
          {[
            { role: 'Admin', email: 'admin@atomberg.com', password: 'Admin@123', color: '#8b5cf6' },
            { role: 'Manager', email: 'manager@atomberg.com', password: 'Manager@123', color: '#3b82f6' },
            { role: 'Employee 1', email: 'employee1@atomberg.com', password: 'Employee@123', color: '#10b981' },
            { role: 'Employee 2', email: 'employee2@atomberg.com', password: 'Employee@123', color: '#10b981' },
            { role: 'Employee 3', email: 'employee3@atomberg.com', password: 'Employee@123', color: '#10b981' },
          ].map(c => (
            <div key={c.email} style={{ ...styles.credRow, borderLeft: `3px solid ${c.color}` }}>
              <div style={{ ...styles.credRole, color: c.color }}>{c.role}</div>
              <div style={styles.credEmail}>{c.email}</div>
              <div style={styles.credPwd}>{c.password}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  filters: { display: 'flex', gap: 8 },
  filterBtn: { padding: '7px 16px', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  tableCard: { background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '12px 16px', background: '#f8faff', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' },
  td: { padding: '13px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  nameCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  roleBadge: { padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  credCard: { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  credTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1e293b' },
  credGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
  credRow: { background: '#f8faff', borderRadius: 10, padding: '12px 14px' },
  credRole: { fontWeight: 700, fontSize: 13, marginBottom: 4 },
  credEmail: { fontSize: 12, color: '#374151', marginBottom: 2 },
  credPwd: { fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }
};
