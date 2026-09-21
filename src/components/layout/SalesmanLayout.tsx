import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, PlusCircle, History, LogOut } from 'lucide-react'
import { SyncStatusBar } from '@/components/common/SyncStatusBar'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import { useAuth } from '@/hooks/useAuth'

export function SalesmanLayout() {
  const { t } = useTranslation()
  const { signOut } = useAuth()

  const TABS = [
    { to: '/app', label: t('salesman.navDashboard'), end: true, icon: Home },
    { to: '/app/new-invoice', label: t('salesman.navNewInvoice'), end: false, icon: PlusCircle },
    { to: '/app/history', label: t('salesman.navHistory'), end: false, icon: History },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <p className="font-bold text-primary-800">InvoicePro</p>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button onClick={() => signOut()} aria-label={t('common.signOut')} className="text-slate-400">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <SyncStatusBar />

      <main className="mx-auto w-full max-w-lg flex-1 p-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom,0px)]">
        <div className="mx-auto flex max-w-lg">
          {TABS.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
                  isActive ? 'text-primary-700' : 'text-slate-400'
                }`
              }
            >
              <Icon className="h-6 w-6" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
