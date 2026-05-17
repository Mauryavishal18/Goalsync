import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = {
  employee: [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/my-goals', icon: '🎯', label: 'My Goals' },
    { path: '/quarterly-update', icon: '📊', label: 'Quarterly Update' },
  ],
  manager: [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/team-goals', icon: '👥', label: 'Team Goals' },
    { path: '/checkins', icon: '✅', label: 'Check-ins' },
    { path: '/shared-goals', icon: '🔗', label: 'Shared Goals' },
    { path: '/reports', icon: '📈', label: 'Reports' },
  ],
  admin: [
    { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/team-goals', icon: '👥', label: 'All Goal Sheets' },
    { path: '/shared-goals', icon: '🔗', label: 'Push Shared Goals' },
    { path: '/reports', icon: '📈', label: 'Reports' },
    { path: '/audit', icon: '🔍', label: 'Audit Trail' },
    { path: '/users', icon: '👤', label: 'Users' },
    { path: '/analytics', icon: '📉', label: 'Analytics' },
  ]
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const items = navItems[user?.role] || [];

  const roleColors = { employee: '#10b981', manager: '#3b82f6', admin: '#8b5cf6' };
  const roleColor = roleColors[user?.role] || '#667eea';

  return (
    <div style={styles.container}>
      <div style={{ ...styles.sidebar, width: collapsed ? 72 : 240 }}>
        <div style={styles.sidebarHeader}>
          {!collapsed && (
            <div>
              <div style={styles.brandName}>⚡ AtomQuest</div>
              <div style={styles.brandSub}>Atomberg Technologies</div>
            </div>
          )}
          {collapsed && <div style={{ fontSize: 24, textAlign: 'center' }}>⚡</div>}
          <button onClick={() => setCollapsed(!collapsed)} style={styles.collapseBtn}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {!collapsed && (
          <div style={{ ...styles.userBadge, borderColor: roleColor }}>
            <div style={{ ...styles.avatar, background: roleColor }}>{user?.name?.[0]}</div>
            <div>
              <div style={styles.userName}>{user?.name}</div>
              <div style={{ ...styles.userRole, color: roleColor }}>{user?.role?.toUpperCase()}</div>
            </div>
          </div>
        )}

        <nav style={styles.nav}>
          {items.map(item => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
              ...styles.navItem,
              background: isActive ? `${roleColor}18` : 'transparent',
              color: isActive ? roleColor : '#64748b',
              borderLeft: isActive ? `3px solid ${roleColor}` : '3px solid transparent',
              justifyContent: collapsed ? 'center' : 'flex-start'
            })}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button onClick={() => { logout(); navigate('/login'); }} style={styles.logoutBtn}>
          {collapsed ? '🚪' : '🚪 Logout'}
        </button>
      </div>

      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', minHeight: '100vh', background: '#f1f5f9' },
  sidebar: { background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', transition: 'width 0.2s ease', overflow: 'hidden', flexShrink: 0 },
  sidebarHeader: { padding: '20px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brandName: { fontWeight: 800, fontSize: 17, color: '#1e293b' },
  brandSub: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  collapseBtn: { background: '#f1f5f9', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#64748b' },
  userBadge: { margin: '12px 12px 4px', padding: '10px 12px', border: '1.5px solid', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, background: '#fafbff' },
  avatar: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 },
  userName: { fontWeight: 600, fontSize: 13, color: '#1e293b' },
  userRole: { fontSize: 10, fontWeight: 700, letterSpacing: 0.5 },
  nav: { flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' },
  navItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', fontWeight: 500, fontSize: 13.5, transition: 'all 0.15s' },
  navLabel: {},
  logoutBtn: { margin: '8px 12px 20px', padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontSize: 13 },
  main: { flex: 1, overflowY: 'auto', padding: '0' }
};
