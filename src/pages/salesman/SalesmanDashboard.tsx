import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useLocalInvoices } from '@/hooks/useSalesmanData'
import { useSalesmanPaymentStats } from '@/hooks/usePayments'
import { formatInr } from '@/lib/gst'
import { Button } from '@/components/common/Button'
import { StatCard } from '@/components/common/StatCard'
import { StatCardSkeleton } from '@/components/common/Skeleton'
import { ReceivedPendingBar } from '@/components/common/ReceivedPendingBar'

export function SalesmanDashboard() {
  const { t } = useTranslation()
  const { salesman } = useAuth()
  const { invoices, loading } = useLocalInvoices(salesman?.id)
  const paymentStats = useSalesmanPaymentStats(salesman?.id)

  const today = useMemo(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todays = invoices.filter((i) => new Date(i.created_at) >= startOfDay && i.status !== 'cancelled')
    return {
      total: todays.reduce((a, i) => a + i.total_amount, 0),
      count: todays.length,
    }
  }, [invoices])

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t('salesman.greeting')}, {salesman?.name?.split(' ')[0]}
        </h1>
        <p className="mt-0.5 text-slate-500">{t('salesman.todayIntro')}</p>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
      ) : (
        <div className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-center text-white shadow-md sm:p-8">
          <p className="text-sm font-medium text-primary-100">{t('salesman.todaySales')}</p>
          <p className="mt-2 break-words text-4xl font-extrabold sm:text-5xl">{formatInr(today.total)}</p>
          <p className="mt-3 text-base text-primary-100 sm:text-lg">
            {t(today.count === 1 ? 'salesman.invoiceCountOne' : 'salesman.invoiceCountOther', { count: today.count })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {paymentStats.data ? (
          <>
            <StatCard label={t('salesman.received')} value={formatInr(paymentStats.data.totalReceived)} tone="success" />
            <StatCard label={t('salesman.pending')} value={formatInr(paymentStats.data.totalPending)} tone="warning" />
          </>
        ) : (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        )}
      </div>

      {paymentStats.data && (paymentStats.data.totalReceived > 0 || paymentStats.data.totalPending > 0) && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <ReceivedPendingBar
            received={paymentStats.data.totalReceived}
            pending={paymentStats.data.totalPending}
            receivedLabel={t('salesman.received')}
            pendingLabel={t('salesman.pending')}
          />
        </div>
      )}

      <Link to="/app/new-invoice" className="block">
        <Button fullWidth className="py-4 text-lg">
          {t('salesman.createInvoice')}
        </Button>
      </Link>
    </div>
  )
}
