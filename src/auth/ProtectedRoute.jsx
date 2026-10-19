import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <p role="status" className="shell">Loading...</p>
  if (status === 'out') return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}