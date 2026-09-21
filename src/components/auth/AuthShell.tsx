import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { LanguageToggle } from '@/components/common/LanguageToggle'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  onBack,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  onBack?: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-50 via-slate-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <p className="text-2xl font-extrabold tracking-tight text-primary-800">InvoicePro</p>
          <LanguageToggle />
        </div>
        <div className="overflow-hidden rounded-3xl bg-white shadow-lg shadow-primary-900/5 ring-1 ring-slate-100">
          <div className="h-1.5 bg-gradient-to-r from-primary-500 to-primary-700" />
          <div className="p-6">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  aria-label="Back"
                  className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            </div>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            <div className="mt-5">{children}</div>
          </div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>}
      </div>
    </div>
  )
}
