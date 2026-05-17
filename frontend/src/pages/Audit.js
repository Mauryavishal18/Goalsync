import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const ACTION_COLORS = {
  LOGIN: '#6366f1', SUBMIT: '#3b82f6', APPROVE: '#10b981', RETURN: '#f59e0b',
  ADMIN_UNLOCK: '#8b5cf6', QUARTERLY_UPDATE: '#06b6d4', CHECKIN_COMMENT: '#10b981',
  SAVE_DRAFT: '#94a3b8', PUSH_SHARED_GOAL: '#f59e0b', MANAGER_EDIT_GOAL: '#f59e0b'
};

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  const load = (pg = 0) => {
    setLoading(true);
    const params = `?limit=${PER_PAGE}&offset=${pg * PER_PAGE}${filter ? `&entity_type=${filter}` : ''}`;
    api.get(`/reports/audit${params}`)
      .then(r => { setLogs(r.data.logs); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(0); setPage(0); }, [filter]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🔍 Audit Trail</h1>
          <p style={styles.sub}>Complete log of all system actions · {total} total entries</p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={styles.filterSelect}>
          <option value="">All Actions</option>
          <option value="goal_sheet">Goal Sheet</option>
          <option value="goal">Goal</option>
          <option value="quarterly_update">Quarterly Update</option>
          <option value="user">User</option>
        </select>
      </div>

      <div style={styles.tableCard}>
        {loading ? <div style={styles.loading}>Loading audit logs...</div> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Timestamp</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Entity</th>
                <th style={styles.th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ background: '#fff' }}>
                  <td style={styles.td}>
                    <div style={styles.timestamp}>{new Date(log.created_at).toLocaleDateString('en-IN')}</div>
                    <div style={styles.time}>{new Date(log.created_at).toLocaleTimeString('en-IN')}</div>
                  </td>
                  <td style={styles.td}><strong>{log.user_name}</strong></td>
                  <td style={styles.td}><span style={styles.roleBadge}>{log.user_role}</span></td>
                  <td style={styles.td}>
                    <span style={{ ...styles.actionBadge, background: `${ACTION_COLORS[log.action] || '#94a3b8'}22`, color: ACTION_COLORS[log.action] || '#64748b' }}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={styles.td}>{log.entity_type} #{log.entity_id || '—'}</td>
                  <td style={styles.td}>
                    {log.new_value && (
                      <details style={{ cursor: 'pointer' }}>
                        <summary style={{ fontSize: 11, color: '#667eea' }}>View changes</summary>
                        <pre style={styles.pre}>{JSON.stringify(JSON.parse(log.new_value), null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={styles.pagination}>
          <button onClick={() => { const p = Math.max(0, page - 1); setPage(p); load(p); }} disabled={page === 0} style={styles.pageBtn}>← Prev</button>
          <span style={styles.pageInfo}>Page {page + 1} of {Math.ceil(total / PER_PAGE)}</span>
          <button onClick={() => { const p = page + 1; setPage(p); load(p); }} disabled={(page + 1) * PER_PAGE >= total} style={styles.pageBtn}>Next →</button>
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
  filterSelect: { padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 },
  tableCard: { background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '12px 16px', background: '#f8faff', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  timestamp: { fontSize: 12, fontWeight: 600, color: '#374151' },
  time: { fontSize: 11, color: '#94a3b8' },
  roleBadge: { background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  actionBadge: { padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  pre: { background: '#f8faff', borderRadius: 6, padding: '8px', fontSize: 10, marginTop: 6, maxWidth: 300, overflow: 'auto' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '16px', borderTop: '1px solid #f1f5f9' },
  pageBtn: { padding: '7px 16px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13 },
  pageInfo: { color: '#64748b', fontSize: 13 }
};
