import { useTranslation } from 'react-i18next'
import { EmailOtpStep } from '@/components/auth/EmailOtpStep'
import { GoogleButton } from '@/components/auth/GoogleButton'

/**
 * All supported sign-in/sign-up methods for a given mode. Every method here
 * ends the same way — a Supabase session gets set, AuthProvider picks it up,
 * and the page rendering this reacts to `useAuth().user` — so adding a method
 * (passkeys/WebAuthn, planned next) means adding one more block below, not
 * restructuring how callers consume this component.
 */
export function AuthMethodChooser({ mode }: { mode: 'login' | 'signup' }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <EmailOtpStep mode={mode} />

      <Divider label={t('auth.or')} />

      <GoogleButton />

      {/* Passkey/WebAuthn sign-in slots in here next — same pattern as
          GoogleButton: kick off the ceremony, let AuthProvider's session
          listener do the rest. Not implemented yet. */}
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  )
}
