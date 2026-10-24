import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { vendorSignupSchema, type VendorSignupInput, indianStates } from '@/lib/validation'
import { phoneFromSignup } from '@/lib/pendingPhone'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthMethodChooser } from '@/components/auth/AuthMethodChooser'
import { Button } from '@/components/common/Button'
import { Input, Select } from '@/components/common/Input'
import { LoadingState } from '@/components/common/States'

export function VendorSignup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { loading, user, vendor, salesman } = useAuth()

  // Already has a profile (signed up before, or is a salesman elsewhere) —
  // don't show the registration form again.
  useEffect(() => {
    if (loading) return
    if (vendor) navigate('/vendor', { replace: true })
    else if (salesman) navigate(salesman.status === 'approved' ? '/app' : '/pending-approval', { replace: true })
  }, [loading, vendor, salesman, navigate])

  if (loading) return <LoadingState />

  if (!user) {
    return (
      <AuthShell title={t('auth.vendorTitle')} subtitle={t('auth.loginSubtitle')} onBack={() => navigate('/signup')}>
        <AuthMethodChooser mode="signup" />
      </AuthShell>
    )
  }

  return <VendorDetailsForm user={user} />
}

/**
 * Only mounted once `user` is settled, so its one-time `defaultValues` (the
 * phone pre-fill) capture the real value instead of running before the
 * profile finished loading — react-hook-form reads defaultValues once at
 * mount and ignores later changes to the option.
 */
function VendorDetailsForm({ user }: { user: User }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [phonePrefill] = useState(() => phoneFromSignup(user))

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorSignupInput>({
    resolver: zodResolver(vendorSignupSchema),
    defaultValues: { phone: phonePrefill },
  })

  async function onSubmit(values: VendorSignupInput) {
    setServerError(null)

    const { error } = await supabase.from('vendors').insert({
      auth_user_id: user.id,
      business_name: values.business_name,
      phone: `+91${values.phone}`,
      gstin: values.gstin || null,
      state: values.state,
      address: values.address || null,
    })

    if (error) {
      // Unique-index hit on vendors.phone — someone registered this number in
      // between the pre-signup check and now.
      setServerError(error.code === '23505' ? t('auth.phoneAlreadyRegistered') : error.message)
      return
    }
    navigate('/vendor', { replace: true })
  }

  return (
    <AuthShell
      title="Business details"
      subtitle="This becomes your InvoicePro vendor profile"
      onBack={() => navigate('/signup')}
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Business name" {...register('business_name')} error={errors.business_name?.message} />
        <Input
          label={t('auth.mobileNumber')}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          readOnly={!!phonePrefill}
          className={phonePrefill ? 'bg-slate-50 text-slate-500' : ''}
          {...register('phone')}
          error={errors.phone?.message}
        />
        <Input label="GSTIN (optional)" {...register('gstin')} error={errors.gstin?.message} />
        <Select label="State" defaultValue="" {...register('state')} error={errors.state?.message}>
          <option value="" disabled>
            Select state
          </option>
          {indianStates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Input label="Address (optional)" {...register('address')} error={errors.address?.message} />
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <Button fullWidth type="submit" loading={isSubmitting}>
          Create vendor account
        </Button>
      </form>
    </AuthShell>
  )
}
