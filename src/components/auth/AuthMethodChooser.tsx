import { EmailLinkStep } from '@/components/auth/EmailLinkStep'

/**
 * The sign-in/sign-up methods offered for a given mode. Every method ends the
 * same way — a Supabase session gets set, AuthProvider picks it up, and the
 * page rendering this reacts to `useAuth().user` — so re-adding one
 * (GoogleButton, PhoneOtpStep, or passkeys later) means rendering it here,
 * not restructuring callers.
 */
export function AuthMethodChooser({ mode }: { mode: 'login' | 'signup' }) {
  return <EmailLinkStep mode={mode} />
}
