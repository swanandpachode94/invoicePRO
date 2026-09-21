import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Users, Package, XCircle, Settings, Download, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { SyncStatusBar } from '@/components/common/SyncStatusBar'
import { LanguageToggle } from '@/components/common/LanguageToggle'

export function VendorLayout() {
  const { t } = useTranslation()
  const { vendor, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const NAV_ITEMS = [
    { to: '/vendor', label: t('vendor.navDashboard'), end: true, icon: LayoutDashboard },
    { to: '/vendor/salesmen', label: t('vendor.navSalesmen'), icon: Users },
    { to: '/vendor/items', label: t('vendor.navItems'), icon: Package },
    { to: '/vendor/cancellations', label: t('vendor.navCancellations'), icon: XCircle },
    { to: '/vendor/settings', label: t('vendor.navSettings'), icon: Settings },
    { to: '/vendor/export', label: t('vendor.navExport'), icon: Download },
  ]

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Desktop: persistent sidebar, every item always visible */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-primary-800">InvoicePro</p>
            <LanguageToggle />
          </div>
          <p className="mt-2 truncate text-sm text-slate-500">{vendor?.business_name}</p>
          <p className="text-xs text-slate-400">{vendor?.vendor_code}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 font-medium ${
                  isActive ? 'bg-primary-50 text-primary-800' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-500 hover:bg-slate-50"
          >
            <LogOut className="h-5 w-5" />
            {t('common.signOut')}
          </button>
        </div>
      </aside>

      <div className="flex-1">
        {/* Mobile: hamburger opens a slide-out drawer instead of a scrolling pill
            row — the pill row hid 3 of 6 tabs off-screen with no clear "more"
            signal; a drawer surfaces the whole menu at once, the conventional
            pattern for this many items on a phone. */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-tap w-tap items-center justify-center text-slate-600"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <p className="font-bold text-primary-800">InvoicePro</p>
              <p className="text-xs text-slate-500">{vendor?.business_name}</p>
            </div>
          </div>
          <LanguageToggle />
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <p className="text-lg font-bold text-primary-800">InvoicePro</p>
                  <p className="mt-1 truncate text-sm text-slate-500">{vendor?.business_name}</p>
                  <p className="text-xs text-slate-400">{vendor?.vendor_code}</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-tap w-tap shrink-0 items-center justify-center text-slate-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {NAV_ITEMS.map(({ to, label, end, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 font-medium ${
                        isActive ? 'bg-primary-50 text-primary-800' : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-slate-100 p-3">
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-slate-500 hover:bg-slate-50"
                >
                  <LogOut className="h-5 w-5" />
                  {t('common.signOut')}
                </button>
              </div>
            </div>
          </div>
        )}

        <SyncStatusBar />

        <main className="mx-auto max-w-6xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
