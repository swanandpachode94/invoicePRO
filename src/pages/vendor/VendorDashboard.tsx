import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats, useItemSalesBreakdown, useSalesmen, useVendorInvoices, useRetailers } from '@/hooks/useVendorData'
import { StatCard } from '@/components/common/StatCard'
import { StatCardSkeleton, TableSkeleton } from '@/components/common/Skeleton'
import { ReceivedPendingBar } from '@/components/common/ReceivedPendingBar'
import { ErrorState, EmptyState } from '@/components/common/States'
import { Badge } from '@/components/common/Badge'
import { Select, Input } from '@/components/common/Input'
import { formatInr } from '@/lib/gst'
import { PERIOD_OPTIONS, computeRange, type PeriodKey } from '@/lib/dateRanges'

export function VendorDashboard() {
  const { t } = useTranslation()
  const { vendor } = useAuth()
  const [salesmanFilter, setSalesmanFilter] = useState('')
  const [retailerFilter, setRetailerFilter] = useState('')
  const [period, setPeriod] = useState<PeriodKey>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const range = useMemo(
    () => computeRange(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo]
  )

  const stats = useDashboardStats(vendor?.id, range)
  const itemBreakdown = useItemSalesBreakdown(vendor?.id, range)
  const salesmen = useSalesmen(vendor?.id)
  const retailers = useRetailers(vendor?.id)
  const filteredInvoices = useVendorInvoices(vendor?.id, {
    salesmanId: salesmanFilter || undefined,
    retailerId: retailerFilter || undefined,
  })

  if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('vendor.dashboardTitle')}</h1>
          <p className="text-sm text-slate-500">{t('vendor.autoUpdate')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)} className="w-auto">
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
          {period === 'custom' && (
            <>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-auto" />
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-auto" />
            </>
          )}
        </div>
      </div>

      {!stats.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t('vendor.totalSales')}
              value={formatInr(stats.data.totalAmount)}
              sublabel={`${stats.data.invoiceCount} invoices`}
              tone="primary"
              big
            />
            <StatCard label={t('vendor.received')} value={formatInr(stats.data.totalReceived)} tone="success" />
            <StatCard label={t('vendor.pending')} value={formatInr(stats.data.totalPending)} tone="warning" />
            <StatCard label={t('vendor.invoices')} value={String(stats.data.invoiceCount)} tone="neutral" />
          </div>

          {(stats.data.totalReceived > 0 || stats.data.totalPending > 0) && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <ReceivedPendingBar
                received={stats.data.totalReceived}
                pending={stats.data.totalPending}
                receivedLabel={t('vendor.received')}
                pendingLabel={t('vendor.pending')}
              />
            </div>
          )}
        </>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">{t('vendor.salesBySalesman')}</h2>
        {!stats.data ? (
          <TableSkeleton />
        ) : stats.data.bySalesman.length === 0 ? (
          <EmptyState title="No sales yet" description="Once salesmen start invoicing, their totals show up here." />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Salesman</th>
                  <th className="px-4 py-3">Invoices</th>
                  <th className="px-4 py-3">Total sales</th>
                </tr>
              </thead>
              <tbody>
                {stats.data.bySalesman.map((s) => (
                  <tr key={s.name} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3">{s.count}</td>
                    <td className="px-4 py-3 font-semibold">{formatInr(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">{t('vendor.salesByItem')}</h2>
        {!itemBreakdown.data ? (
          <TableSkeleton />
        ) : itemBreakdown.data.length === 0 ? (
          <EmptyState title="No item sales yet" />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Qty sold</th>
                  <th className="px-4 py-3">Total sales</th>
                </tr>
              </thead>
              <tbody>
                {itemBreakdown.data.map((i) => (
                  <tr key={i.name} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{i.name}</td>
                    <td className="px-4 py-3">{i.quantity}</td>
                    <td className="px-4 py-3 font-semibold">{formatInr(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{t('vendor.recentInvoices')}</h2>
          <div className="flex flex-wrap gap-2">
            <Select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="w-auto">
              <option value="">All salesmen</option>
              {salesmen.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={retailerFilter} onChange={(e) => setRetailerFilter(e.target.value)} className="w-auto">
              <option value="">All retailers</option>
              {retailers.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!filteredInvoices.data ? (
          <TableSkeleton />
        ) : filteredInvoices.data.length === 0 ? (
          <EmptyState title="No invoices match these filters" />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Salesman</th>
                  <th className="px-4 py-3">Retailer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.data.slice(0, 50).map((inv) => {
                  const received = (inv.invoice_payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
                  const paymentTone = received <= 0 ? 'warning' : received >= Number(inv.total_amount) ? 'success' : 'neutral'
                  const paymentLabel = received <= 0 ? 'Pending' : received >= Number(inv.total_amount) ? 'Paid' : 'Partial'
                  return (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{inv.invoice_number ?? '—'}</td>
                      <td className="px-4 py-3">{inv.salesmen?.name}</td>
                      <td className="px-4 py-3">{inv.retailers?.name}</td>
                      <td className="px-4 py-3 font-semibold">{formatInr(inv.total_amount)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={inv.status === 'synced' ? 'success' : inv.status === 'cancelled' ? 'danger' : 'warning'}
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {inv.status === 'cancelled' ? '—' : <Badge tone={paymentTone}>{paymentLabel}</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
