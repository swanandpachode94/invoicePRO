import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useVendorInvoices } from '@/hooks/useVendorData'
import { toCsv, downloadCsv } from '@/lib/csv'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { EmptyState } from '@/components/common/States'

export function InvoiceExport() {
  const { vendor } = useAuth()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const invoices = useVendorInvoices(vendor?.id, {
    fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
    toDate: toDate ? new Date(new Date(toDate).getTime() + 86_400_000).toISOString() : undefined,
  })

  function handleExport() {
    const rows = (invoices.data ?? []).map((inv) => ({
      invoice_number: inv.invoice_number ?? '',
      date: new Date(inv.created_at).toLocaleDateString('en-IN'),
      salesman: inv.salesmen?.name ?? '',
      retailer: inv.retailers?.name ?? '',
      subtotal: inv.subtotal,
      total_gst: inv.total_gst,
      total_amount: inv.total_amount,
      status: inv.status,
    }))
    downloadCsv(`invoices-${fromDate || 'all'}-to-${toDate || 'all'}.csv`, toCsv(rows))
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Export invoices</h1>

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="grid grid-cols-2 gap-3">
          <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <p className="text-sm text-slate-500">
          {invoices.data ? `${invoices.data.length} invoice(s) match this range` : 'Loading…'}
        </p>
        {invoices.data && invoices.data.length === 0 ? (
          <EmptyState title="Nothing to export for this range" />
        ) : (
          <Button fullWidth onClick={handleExport} disabled={!invoices.data?.length}>
            Download CSV
          </Button>
        )}
      </div>
    </div>
  )
}
