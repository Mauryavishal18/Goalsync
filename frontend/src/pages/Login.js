import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role) => {
    const creds = {
      employee: { email: 'employee1@atomberg.com', password: 'Employee@123' },
      manager: { email: 'manager@atomberg.com', password: 'Manager@123' },
      admin: { email: 'admin@atomberg.com', password: 'Admin@123' }
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>⚡</div>
          <h1 style={styles.title}>AtomQuest</h1>
          <p style={styles.subtitle}>Goal Setting & Tracking Portal</p>
          <p style={styles.company}>Atomberg Technologies</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              placeholder="Enter your email"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.demoSection}>
          <p style={styles.demoTitle}>Quick Demo Login</p>
          <div style={styles.demoButtons}>
            {['employee', 'manager', 'admin'].map(role => (
              <button key={role} onClick={() => quickLogin(role)} style={styles.demoBtn}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.credBox}>
          <p style={{margin: '0 0 6px', fontWeight: 600, color: '#374151'}}>Demo Credentials</p>
          <div style={{fontSize: 12, color: '#6b7280', lineHeight: 1.8}}>
            <div>👤 Employee: employee1@atomberg.com / Employee@123</div>
            <div>👔 Manager: manager@atomberg.com / Manager@123</div>
            <div>🛡️ Admin: admin@atomberg.com / Admin@123</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { background: '#fff', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' },
  header: { textAlign: 'center', marginBottom: 32 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.5px' },
  subtitle: { margin: '4px 0 2px', color: '#6b7280', fontSize: 14 },
  company: { margin: 0, color: '#667eea', fontSize: 13, fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', transition: 'border-color 0.2s', background: '#f9fafb' },
  btn: { padding: '13px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  demoSection: { textAlign: 'center', marginBottom: 16 },
  demoTitle: { margin: '0 0 10px', fontSize: 12, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 },
  demoButtons: { display: 'flex', gap: 8, justifyContent: 'center' },
  demoBtn: { padding: '7px 16px', border: '1.5px solid #667eea', color: '#667eea', background: 'transparent', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  credBox: { background: '#f8faff', border: '1px solid #e0e7ff', borderRadius: 10, padding: '12px 14px', fontSize: 12 }
};
