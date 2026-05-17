import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Analytics() {
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [data, setData] = useState(null);
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
    api.get(`/reports/analytics/${activeCycle.id}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [activeCycle]);

  if (loading) return <div style={styles.loading}>Loading analytics...</div>;
  if (!data) return null;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📉 Analytics Dashboard</h1>
          <p style={styles.sub}>{activeCycle?.name}</p>
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Department-wise Approval Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.deptStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="department" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_employees" fill="#667eea" name="Total" radius={[4,4,0,0]} />
              <Bar dataKey="approved" fill="#10b981" name="Approved" radius={[4,4,0,0]} />
              <Bar dataKey="submitted" fill="#f59e0b" name="Pending" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Thrust Area Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.thrustDist} dataKey="goal_count" nameKey="thrust_area" cx="50%" cy="50%" outerRadius={90} label={({ thrust_area, percent }) => `${thrust_area?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {data.thrustDist?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Quarter-on-Quarter Progress</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.quarterProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip formatter={(v) => v?.toFixed(1) + '%'} />
              <Legend />
              <Line type="monotone" dataKey="avg_score" stroke="#667eea" strokeWidth={2.5} dot={{ r: 5 }} name="Avg Progress Score %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>UoM Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.uomBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="uom_type" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" radius={[0,4,4,0]} name="Goals">
                {data.uomBreakdown?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Manager Effectiveness</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Manager</th>
              <th style={styles.th}>Team Size</th>
              <th style={styles.th}>Approved</th>
              <th style={styles.th}>Approval Rate</th>
              <th style={styles.th}>Check-ins Done</th>
              <th style={styles.th}>Effectiveness</th>
            </tr>
          </thead>
          <tbody>
            {data.managerStats?.map(m => {
              const rate = m.team_size ? ((m.approved_count / m.team_size) * 100).toFixed(0) : 0;
              return (
                <tr key={m.manager_id}>
                  <td style={styles.td}><strong>{m.manager_name}</strong></td>
                  <td style={styles.td}>{m.team_size}</td>
                  <td style={styles.td}>{m.approved_count}</td>
                  <td style={styles.td}>
                    <div style={styles.rateBar}>
                      <div style={{ ...styles.rateFill, width: `${rate}%`, background: rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444' }} />
                      <span style={styles.rateText}>{rate}%</span>
                    </div>
                  </td>
                  <td style={styles.td}>{m.total_checkins}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.effBadge, background: rate >= 80 ? '#d1fae5' : rate >= 50 ? '#fef3c7' : '#fee2e2', color: rate >= 80 ? '#065f46' : rate >= 50 ? '#92400e' : '#991b1b' }}>
                      {rate >= 80 ? 'High' : rate >= 50 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px' },
  loading: { padding: 40, textAlign: 'center', color: '#94a3b8' },
  header: { marginBottom: 24 },
  title: { margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' },
  sub: { margin: '4px 0 0', color: '#64748b', fontSize: 14 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  card: { background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 0 },
  cardTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1e293b' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8faff', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' },
  td: { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  rateBar: { display: 'flex', alignItems: 'center', gap: 8 },
  rateFill: { height: 8, borderRadius: 10, minWidth: 4, maxWidth: 100 },
  rateText: { fontSize: 12, fontWeight: 600, color: '#374151' },
  effBadge: { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }
};
