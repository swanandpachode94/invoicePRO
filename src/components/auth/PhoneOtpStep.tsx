import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { phoneSchema, otpSchema } from '@/lib/validation'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

/**
 * Two-step phone + OTP flow, one of several methods offered by
 * AuthMethodChooser. For local dev, configure a Supabase test phone number +
 * fixed OTP (Dashboard → Authentication → Providers → Phone → Test OTP) so no
 * real SMS is sent — see CREDENTIALS.md.
 *
 * `onVerified` is optional: verifying sets a Supabase session directly, which
 * propagates through AuthProvider on its own, so callers can just watch
 * `useAuth().user` instead (the pattern Google/email-confirmation need anyway,
 * since those involve a page reload that would lose a local callback's state).
 */
export function PhoneOtpStep({
  mode,
  onVerified,
}: {
  mode: 'login' | 'signup'
  onVerified?: (phone: string) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function sendOtp() {
    const parsed = phoneSchema.safeParse(phone)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${parsed.data}`,
      // Login shouldn't silently create a brand-new account for a number
      // that was never signed up — only signup is allowed to create one.
      options: { shouldCreateUser: mode === 'signup' },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep('otp')
  }

  async function verify() {
    const parsed = otpSchema.safeParse(code)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`,
      token: parsed.data,
      type: 'sms',
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onVerified?.(`+91${phone}`)
  }

  if (step === 'phone') {
    return (
      <div className="space-y-4">
        <Input
          label={t('auth.mobileNumber')}
          type="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={error ?? undefined}
          maxLength={10}
        />
        <Button fullWidth loading={loading} onClick={sendOtp}>
          {t('auth.sendOtp')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        {t('auth.codeSentTo')} +91 {phone}
      </p>
      <Input
        label={t('auth.enterOtp')}
        type="tel"
        inputMode="numeric"
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={error ?? undefined}
        maxLength={8}
      />
      <Button fullWidth loading={loading} onClick={verify}>
        {t('auth.verifyContinue')}
      </Button>
      <button className="w-full text-center text-sm font-medium text-primary-700" onClick={() => setStep('phone')}>
        {t('auth.changeNumber')}
      </button>
    </div>
  )
}
