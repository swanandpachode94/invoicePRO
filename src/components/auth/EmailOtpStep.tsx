import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { signupEmailOtpSchema, loginEmailOtpSchema, otpSchema } from '@/lib/validation'
import { savePendingPhone } from '@/lib/pendingPhone'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

interface FormValues {
  phone?: string
  email: string
}

/**
 * A 6-digit code delivered to email — no SMS provider needed at all. Signup
 * also collects a phone number to attach to the new account; login only asks
 * for email, since the phone is already on file from signup and isn't needed
 * to find or verify the account.
 */
export function EmailOtpStep({ mode }: { mode: 'login' | 'signup' }) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(mode === 'signup' ? signupEmailOtpSchema : loginEmailOtpSchema) })

  async function sendOtp(values: FormValues) {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      // Login shouldn't silently create a brand-new account for an email
      // that was never signed up — only signup is allowed to create one.
      options: { shouldCreateUser: mode === 'signup' },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (mode === 'signup' && values.phone) savePendingPhone(values.phone)
    setEmail(values.email)
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
    const { error } = await supabase.auth.verifyOtp({ email, token: parsed.data, type: 'email' })
    setLoading(false)
    if (error) setError(error.message)
  }

  if (step === 'details') {
    return (
      <form className="space-y-4" onSubmit={handleSubmit(sendOtp)}>
        {mode === 'signup' && (
          <Input
            label={t('auth.mobileNumber')}
            type="tel"
            inputMode="numeric"
            placeholder="98765 43210"
            maxLength={10}
            {...register('phone')}
            error={errors.phone?.message}
          />
        )}
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button fullWidth loading={loading} type="submit">
          {t('auth.sendOtp')}
        </Button>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800">
        {t('auth.codeSentTo')} <span className="font-semibold">{email}</span>
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
      <button
        className="w-full text-center text-sm font-medium text-primary-700"
        onClick={() => {
          setStep('details')
          setCode('')
          setError(null)
        }}
      >
        {mode === 'signup' ? t('auth.changeNumber') : t('auth.changeEmail')}
      </button>
    </div>
  )
}
