import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/common/Button'

export function PendingApproval() {
  const { salesman, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (salesman?.status === 'approved') {
      navigate('/app', { replace: true })
    }
  }, [salesman?.status, navigate])

  return (
    <AuthShell title="Waiting for approval" subtitle="">
      <div className="space-y-4 text-center">
        <p className="text-slate-600">
          Your request to join <strong>{salesman?.vendor_id ? 'your distributor' : 'this vendor'}</strong> has
          been sent. You'll be able to create invoices as soon as they approve your account.
        </p>
        <Button fullWidth variant="secondary" onClick={() => refreshProfile()}>
          Check status
        </Button>
        <button className="text-sm font-medium text-slate-400" onClick={() => signOut()}>
          Sign out
        </button>
      </div>
    </AuthShell>
  )
}
