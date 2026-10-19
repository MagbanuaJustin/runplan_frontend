import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Activities from './pages/Activities.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Register from './pages/Register.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<ComingSoon title="Calendar" />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/plan" element={<ComingSoon title="Plan" />} />
          <Route path="/profile" element={<ComingSoon title="Profile" />} />
        </Route>
      </Route>
      <Route path="*" element={<ComingSoon title="Page not found" />} />
    </Routes>
  )
}