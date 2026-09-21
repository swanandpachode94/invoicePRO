import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useLocalInvoices } from '@/hooks/useSalesmanData'
import { formatInr } from '@/lib/gst'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { EmptyState } from '@/components/common/States'
import { ListSkeleton } from '@/components/common/Skeleton'
import type { DraftInvoice } from '@/types'

const PAGE_SIZE = 20

export function InvoiceHistory() {
  const { t } = useTranslation()
  const { salesman } = useAuth()
  const { invoices, loading } = useLocalInvoices(salesman?.id)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const from = fromDate ? new Date(fromDate).getTime() : null
    const to = toDate ? new Date(toDate).getTime() + 86_400_000 : null
    return invoices.filter((inv) => {
      const ts = new Date(inv.created_at).getTime()
      if (from !== null && ts < from) return false
      if (to !== null && ts >= to) return false
      return true
    })
  }, [invoices, fromDate, toDate])

  const visible = filtered.slice(0, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t('salesman.invoiceHistoryTitle')}</h1>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('salesman.from')}
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value)
            setPage(1)
          }}
        />
        <Input
          label={t('salesman.to')}
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t('salesman.noInvoicesFound')} description={t('salesman.noInvoicesDesc')} />
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((inv) => (
              <InvoiceRow key={inv.client_generated_id} invoice={inv} />
            ))}
          </div>
          {visible.length < filtered.length && (
            <Button variant="secondary" fullWidth onClick={() => setPage((p) => p + 1)}>
              {t('salesman.loadMore')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function InvoiceRow({ invoice }: { invoice: DraftInvoice }) {
  const { t } = useTranslation()
  const badge =
    invoice.status === 'cancelled' ? (
      <Badge tone="danger">{t('salesman.cancelledBadge')}</Badge>
    ) : invoice.status === 'synced' ? (
      <Badge tone="success">{invoice.invoice_number}</Badge>
    ) : (
      <Badge tone="warning">{t('salesman.pendingSyncBadge')}</Badge>
    )

  return (
    <Link
      to={`/app/invoice/${invoice.client_generated_id}`}
      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 active:bg-slate-50"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-800">{invoice.retailer_name}</p>
        <p className="text-sm text-slate-500">
          {new Date(invoice.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold text-slate-900">{formatInr(invoice.total_amount)}</p>
        <div className="mt-1">{badge}</div>
      </div>
    </Link>
  )
}
