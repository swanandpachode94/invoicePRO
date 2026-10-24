import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCancellationRequests, useReviewCancellation, useReopenCancellation } from '@/hooks/useVendorData'
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States'
import { Badge } from '@/components/common/Badge'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { formatInr } from '@/lib/gst'

type Request = NonNullable<ReturnType<typeof useCancellationRequests>['data']>[number]

export function CancellationApprovals() {
  const { vendor } = useAuth()
  const requests = useCancellationRequests(vendor?.id)
  const review = useReviewCancellation()
  const reopen = useReopenCancellation()
  const [reopening, setReopening] = useState<Request | null>(null)

  if (requests.isLoading) return <LoadingState label="Loading requests…" />
  if (requests.isError) return <ErrorState onRetry={() => requests.refetch()} />

  const pending = (requests.data ?? []).filter((r) => r.status === 'pending')
  const resolved = (requests.data ?? []).filter((r) => r.status !== 'pending')

  async function confirmReopen() {
    if (!reopening) return
    await reopen.mutateAsync(reopening.id)
    setReopening(null)
  }

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
                <div className="flex flex-wrap items-start justify-between gap-3">
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
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {r.invoices.invoice_number ?? '—'} · {formatInr(r.invoices.total_amount)}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">"{r.reason}"</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={r.status === 'approved' ? 'danger' : 'neutral'}>{r.status}</Badge>
                  <Button variant="ghost" onClick={() => setReopening(r)}>
                    <RotateCcw className="h-4 w-4" />
                    Change decision
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {reopening && (
        <Modal open title="Change this decision?" onClose={() => setReopening(null)}>
          <div className="space-y-4">
            <p className="text-slate-700">
              {reopening.status === 'approved' ? (
                <>
                  Invoice <span className="font-semibold">{reopening.invoices.invoice_number}</span> will become active
                  again, and the request moves back to <span className="font-semibold">Pending</span> so you can approve
                  or reject it.
                </>
              ) : (
                <>
                  The request for invoice <span className="font-semibold">{reopening.invoices.invoice_number}</span> moves
                  back to <span className="font-semibold">Pending</span> so you can approve or reject it again.
                </>
              )}
            </p>
            {reopen.isError && (
              <p className="text-sm text-red-600">
                {reopen.error instanceof Error ? reopen.error.message : 'Could not change the decision'}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setReopening(null)}>
                Cancel
              </Button>
              <Button fullWidth loading={reopen.isPending} onClick={confirmReopen}>
                Move to pending
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
