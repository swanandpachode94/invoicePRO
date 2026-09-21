import { formatInr } from '@/lib/gst'

// Fixed status palette (never themed) — see dataviz skill: good/warning are
// reserved hues, deliberately distinct from the app's primary/categorical colors,
// and always paired with an icon-equivalent (a swatch) + text label, never color alone.
const GOOD = '#0ca30c'
const WARNING = '#fab219'

export function ReceivedPendingBar({
  received,
  pending,
  receivedLabel,
  pendingLabel,
}: {
  received: number
  pending: number
  receivedLabel: string
  pendingLabel: string
}) {
  const total = received + pending
  const receivedPct = total > 0 ? (received / total) * 100 : 0
  const pendingPct = total > 0 ? (pending / total) * 100 : 0

  return (
    <div>
      <div
        className="flex h-6 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${receivedLabel} ${formatInr(received)}, ${pendingLabel} ${formatInr(pending)}`}
      >
        {receivedPct > 0 && <div className="h-full" style={{ width: `${receivedPct}%`, backgroundColor: GOOD }} />}
        {receivedPct > 0 && pendingPct > 0 && <div className="h-full w-[2px] bg-slate-100" />}
        {pendingPct > 0 && <div className="h-full" style={{ width: `${pendingPct}%`, backgroundColor: WARNING }} />}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GOOD }} />
          <span className="text-slate-500">{receivedLabel}</span>
          <span className="font-semibold text-slate-900">{formatInr(received)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WARNING }} />
          <span className="text-slate-500">{pendingLabel}</span>
          <span className="font-semibold text-slate-900">{formatInr(pending)}</span>
        </span>
      </div>
    </div>
  )
}
