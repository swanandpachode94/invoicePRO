import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingState } from '@/components/common/States'

export function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingState label="Checking your session…" />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireRole({ role }: { role: 'vendor' | 'salesman' }) {
  const { role: currentRole, loading, salesman } = useAuth()
  if (loading) return <LoadingState />

  if (role === 'salesman' && salesman && salesman.status !== 'approved') {
    return <Navigate to="/pending-approval" replace />
  }

  if (currentRole !== role) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
