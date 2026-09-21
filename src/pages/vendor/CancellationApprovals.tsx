import { useAuth } from '@/hooks/useAuth'
import { useCancellationRequests, useReviewCancellation } from '@/hooks/useVendorData'
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { formatInr } from '@/lib/gst'

export function CancellationApprovals() {
  const { vendor } = useAuth()
  const requests = useCancellationRequests(vendor?.id)
  const review = useReviewCancellation()

  if (requests.isLoading) return <LoadingState label="Loading requests…" />
  if (requests.isError) return <ErrorState onRetry={() => requests.refetch()} />

  const pending = (requests.data ?? []).filter((r) => r.status === 'pending')
  const resolved = (requests.data ?? []).filter((r) => r.status !== 'pending')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Cancellation requests</h1>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Pending</h2>
        {pending.length === 0 ? (
          <EmptyState title="No pending cancellation requests" />
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      Invoice {r.invoices.invoice_number ?? '(pending sync)'} · {formatInr(r.invoices.total_amount)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">"{r.reason}"</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" onClick={() => review.mutate({ id: r.id, approve: true })} loading={review.isPending}>
                      Approve
                    </Button>
                    <Button variant="danger" onClick={() => review.mutate({ id: r.id, approve: false })} loading={review.isPending}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-900">History</h2>
        {resolved.length === 0 ? (
          <EmptyState title="No resolved requests yet" />
        ) : (
          <div className="space-y-2">
            {resolved.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                <span className="text-sm text-slate-700">{r.invoices.invoice_number ?? '—'}</span>
                <Badge tone={r.status === 'approved' ? 'danger' : 'neutral'}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
