import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { salesmanSignupSchema, type SalesmanSignupInput } from '@/lib/validation'
import { consumePendingPhone } from '@/lib/pendingPhone'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthMethodChooser } from '@/components/auth/AuthMethodChooser'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { LoadingState } from '@/components/common/States'

export function SalesmanSignup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { loading, user, vendor, salesman } = useAuth()

  useEffect(() => {
    if (loading) return
    if (salesman) navigate(salesman.status === 'approved' ? '/app' : '/pending-approval', { replace: true })
    else if (vendor) navigate('/vendor', { replace: true })
  }, [loading, vendor, salesman, navigate])

  if (loading) return <LoadingState />

  if (!user) {
    return (
      <AuthShell title={t('auth.salesmanTitle')} subtitle={t('auth.loginSubtitle')} onBack={() => navigate('/signup')}>
        <AuthMethodChooser mode="signup" />
      </AuthShell>
    )
  }

  return <SalesmanDetailsForm user={user} />
}

/**
 * Only mounted once `user` is settled, so its one-time `defaultValues` (the
 * phone pre-fill) capture the real value instead of running before the
 * profile finished loading — react-hook-form reads defaultValues once at
 * mount and ignores later changes to the option.
 */
function SalesmanDetailsForm({ user }: { user: User }) {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  // Phone+email-OTP signups typed a phone during that step (carried across via
  // sessionStorage, since email-OTP auth never sets it on the auth user itself).
  // Google/plain email+password signups have neither — an empty, editable field.
  const [phonePrefill] = useState(() => consumePendingPhone())

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SalesmanSignupInput>({
    resolver: zodResolver(salesmanSignupSchema),
    defaultValues: { phone: phonePrefill },
  })

  async function onSubmit(values: SalesmanSignupInput) {
    setServerError(null)

    const { data: vendorMatch, error: lookupError } = await supabase
      .rpc('lookup_vendor_by_code', { p_code: values.vendor_code })
      .returns<{ id: string; business_name: string }[]>()
      .maybeSingle()

    if (lookupError || !vendorMatch) {
      setServerError('No vendor found with that code. Double-check it with your distributor.')
      return
    }

    const { error } = await supabase.from('salesmen').insert({
      auth_user_id: user.id,
      vendor_id: vendorMatch.id,
      name: values.name,
      phone: `+91${values.phone}`,
      status: 'pending',
    })

    if (error) {
      setServerError(error.message)
      return
    }
    navigate('/pending-approval', { replace: true })
  }

  return (
    <AuthShell
      title="Your details"
      subtitle="Ask your distributor for their vendor code"
      onBack={() => navigate('/signup')}
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Your full name" {...register('name')} error={errors.name?.message} />
        <Input label="Mobile number" {...register('phone')} error={errors.phone?.message} />
        <Input
          label="Vendor code"
          placeholder="VEN-XXXX"
          {...register('vendor_code')}
          error={errors.vendor_code?.message}
        />
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <Button fullWidth type="submit" loading={isSubmitting}>
          Submit for approval
        </Button>
      </form>
    </AuthShell>
  )
}
