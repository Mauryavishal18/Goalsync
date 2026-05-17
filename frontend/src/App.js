import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyGoals from './pages/MyGoals';
import TeamGoals from './pages/TeamGoals';
import QuarterlyUpdate from './pages/QuarterlyUpdate';
import Checkins from './pages/Checkins';
import SharedGoals from './pages/SharedGoals';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Audit from './pages/Audit';
import Users from './pages/Users';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#94a3b8' }}>Loading AtomQuest...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/my-goals" element={<PrivateRoute roles={['employee']}><MyGoals /></PrivateRoute>} />
      <Route path="/quarterly-update" element={<PrivateRoute roles={['employee']}><QuarterlyUpdate /></PrivateRoute>} />
      <Route path="/team-goals" element={<PrivateRoute roles={['manager','admin']}><TeamGoals /></PrivateRoute>} />
      <Route path="/checkins" element={<PrivateRoute roles={['manager','admin']}><Checkins /></PrivateRoute>} />
      <Route path="/shared-goals" element={<PrivateRoute roles={['manager','admin']}><SharedGoals /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute roles={['manager','admin']}><Reports /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute roles={['admin']}><Analytics /></PrivateRoute>} />
      <Route path="/audit" element={<PrivateRoute roles={['admin']}><Audit /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute roles={['admin']}><Users /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: 13, borderRadius: 10, fontWeight: 500 } }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
