import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, Receipt } from 'lucide-react'
import { AuthShell } from '@/components/auth/AuthShell'

export function ChooseSignup() {
  const { t } = useTranslation()
  return (
    <AuthShell
      title={t('auth.createAccount')}
      subtitle={t('auth.chooseRole')}
      footer={
        <span>
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-semibold text-primary-700">
            {t('auth.login')}
          </Link>
        </span>
      }
    >
      <div className="space-y-3">
        <Link
          to="/signup/vendor"
          className="flex min-h-tap items-center gap-4 rounded-2xl border-2 border-primary-600 bg-primary-50/50 p-4 transition-colors hover:bg-primary-50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-700 text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-bold text-slate-900">{t('auth.vendorTitle')}</span>
            <span className="block text-sm text-slate-500">{t('auth.vendorDesc')}</span>
          </span>
        </Link>
        <Link
          to="/signup/salesman"
          className="flex min-h-tap items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-white">
            <Receipt className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-bold text-slate-900">{t('auth.salesmanTitle')}</span>
            <span className="block text-sm text-slate-500">{t('auth.salesmanDesc')}</span>
          </span>
        </Link>
      </div>
    </AuthShell>
  )
}
