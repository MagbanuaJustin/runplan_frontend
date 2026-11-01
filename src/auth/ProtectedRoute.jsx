import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import PageLoading from '../components/PageLoading.jsx'

export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoading variant="screen" label="Checking your session…" />
  if (status === 'out') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export function AdminRoute() {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoading variant="screen" label="Checking your session…" />
  if (status === 'out') return <Navigate to="/login" replace state={{ from: location }} />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}