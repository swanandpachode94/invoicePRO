import { useAuth } from '@/hooks/useAuth'
import { useSalesmen, useUpdateSalesmanStatus, useVendorInvoices } from '@/hooks/useVendorData'
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { formatInr } from '@/lib/gst'

export function SalesmenManagement() {
  const { vendor } = useAuth()
  const salesmen = useSalesmen(vendor?.id)
  const invoices = useVendorInvoices(vendor?.id)
  const updateStatus = useUpdateSalesmanStatus()

  if (salesmen.isLoading) return <LoadingState label="Loading salesmen…" />
  if (salesmen.isError) return <ErrorState onRetry={() => salesmen.refetch()} />

  const statsFor = (salesmanId: string) => {
    const rows = (invoices.data ?? []).filter((i) => i.salesman_id === salesmanId && i.status !== 'cancelled')
    return { count: rows.length, total: rows.reduce((a, i) => a + Number(i.total_amount), 0) }
  }

  const pending = (salesmen.data ?? []).filter((s) => s.status === 'pending')
  const approved = (salesmen.data ?? []).filter((s) => s.status !== 'pending')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Salesmen</h1>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Pending approval</h2>
        {pending.length === 0 ? (
          <EmptyState title="No pending requests" />
        ) : (
          <div className="space-y-3">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">{s.name}</p>
                  <p className="text-sm text-slate-500">{s.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => updateStatus.mutate({ id: s.id, status: 'approved' })}
                    loading={updateStatus.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => updateStatus.mutate({ id: s.id, status: 'deactivated' })}
                    loading={updateStatus.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">All salesmen</h2>
        {approved.length === 0 ? (
          <EmptyState title="No approved salesmen yet" />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Invoices</th>
                  <th className="px-4 py-3">Total sales</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {approved.map((s) => {
                  const stat = statsFor(s.id)
                  return (
                    <tr key={s.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-4 py-3">{s.phone}</td>
                      <td className="px-4 py-3">
                        <Badge tone={s.status === 'approved' ? 'success' : 'danger'}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{stat.count}</td>
                      <td className="px-4 py-3 font-semibold">{formatInr(stat.total)}</td>
                      <td className="px-4 py-3">
                        {s.status === 'approved' && (
                          <button
                            className="font-medium text-red-600"
                            onClick={() => updateStatus.mutate({ id: s.id, status: 'deactivated' })}
                          >
                            Deactivate
                          </button>
                        )}
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
