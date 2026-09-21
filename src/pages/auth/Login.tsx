import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthMethodChooser } from '@/components/auth/AuthMethodChooser'
import { LoadingState } from '@/components/common/States'

export function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { loading, user, role, vendor, salesman } = useAuth()

  // Reacts to the AuthProvider's own session state rather than a local
  // "verified" flag — necessary because Google (full-page redirect) and an
  // email-confirmation link both reload the page, which would wipe any local
  // state. Phone/OTP verifies on the same page and lands here too, since it
  // updates the same context.
  useEffect(() => {
    if (loading || !user) return
    if (role === 'vendor') {
      navigate('/vendor', { replace: true })
    } else if (role === 'salesman') {
      navigate(salesman?.status === 'approved' ? '/app' : '/pending-approval', { replace: true })
    } else if (!vendor && !salesman) {
      navigate('/signup', { replace: true })
    }
  }, [loading, user, role, vendor, salesman, navigate])

  if (user) {
    return (
      <AuthShell title={t('auth.login')} subtitle={t('auth.signingIn')}>
        <LoadingState />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={t('auth.login')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <span>
          {t('auth.newHere')}{' '}
          <Link to="/signup" className="font-semibold text-primary-700">
            {t('auth.createAccount')}
          </Link>
        </span>
      }
    >
      <AuthMethodChooser mode="login" />
    </AuthShell>
  )
}
