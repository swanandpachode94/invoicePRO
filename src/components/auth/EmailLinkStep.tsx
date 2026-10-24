import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { MailCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { signupEmailSchema, loginEmailSchema } from '@/lib/validation'
import { savePendingPhone } from '@/lib/pendingPhone'
import { getRememberedEmail, rememberEmail } from '@/lib/rememberedEmail'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

interface FormValues {
  phone?: string
  email: string
}

/**
 * Emails a verification link (no code to type). Clicking it lands back on
 * this same page signed in — supabase.ts has detectSessionInUrl on — and the
 * page reacts to `useAuth().user` from there. Signup also collects the mobile
 * number, which identifies the account and must be unique.
 */
export function EmailLinkStep({ mode }: { mode: 'login' | 'signup' }) {
  const { t } = useTranslation()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(mode === 'signup' ? signupEmailSchema : loginEmailSchema),
    defaultValues: { email: getRememberedEmail() },
  })

  async function onSubmit(values: FormValues) {
    setError(null)
    const email = values.email.trim().toLowerCase()

    if (mode === 'signup' && values.phone) {
      const { data, error: checkError } = await supabase
        .rpc('check_registration', { p_email: email, p_phone: `+91${values.phone}` })
        .returns<{ email_registered: boolean; phone_registered: boolean }[]>()
        .single()
      if (checkError) {
        setError(checkError.message)
        return
      }
      if (data.email_registered) {
        setError(t('auth.emailAlreadyRegistered'))
        return
      }
      if (data.phone_registered) {
        setError(t('auth.phoneAlreadyRegistered'))
        return
      }
      // Same-device fallback for the details form; user_metadata below covers
      // opening the link on another device, but is only written for new users.
      savePendingPhone(values.phone)
    }

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Login must never quietly create an account for an unknown email.
        shouldCreateUser: mode === 'signup',
        emailRedirectTo: window.location.origin + window.location.pathname,
        data: mode === 'signup' ? { phone: values.phone } : undefined,
      },
    })
    if (sendError) {
      const unknownEmail = mode === 'login' && /signups? not allowed/i.test(sendError.message)
      setError(unknownEmail ? t('auth.emailNotRegistered') : sendError.message)
      return
    }

    rememberEmail(email)
    setSentTo(email)
  }

  if (sentTo) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl bg-primary-50 px-4 py-4 text-sm text-primary-800">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t('auth.checkEmailTitle')}</p>
            <p className="mt-1">
              {t('auth.checkEmailBody')} <span className="font-semibold break-all">{sentTo}</span>
            </p>
          </div>
        </div>
        <button
          className="w-full text-center text-sm font-medium text-primary-700"
          onClick={() => {
            setSentTo(null)
            setError(null)
          }}
        >
          {t('auth.changeEmail')}
        </button>
      </div>
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {mode === 'signup' && (
        <Input
          label={t('auth.mobileNumber')}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          maxLength={10}
          {...register('phone')}
          error={errors.phone?.message}
        />
      )}
      <Input
        label={t('auth.email')}
        type="email"
        inputMode="email"
        autoComplete="email"
        {...register('email')}
        error={errors.email?.message}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button fullWidth loading={isSubmitting} type="submit">
        {t('auth.sendLink')}
      </Button>
    </form>
  )
}
