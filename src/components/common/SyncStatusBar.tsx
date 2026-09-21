import { useEffect } from 'react'
import { useOfflineStore } from '@/store/offlineStore'
import { getPendingInvoices } from '@/lib/db'
import { runSync } from '@/lib/syncManager'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function SyncStatusBar() {
  const { pendingCount, syncing, lastError, setPendingCount } = useOfflineStore()
  const online = useOnlineStatus()

  useEffect(() => {
    getPendingInvoices().then((rows) => setPendingCount(rows.length))
  }, [setPendingCount])

  if (pendingCount === 0 && !lastError) return null

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm ${
        lastError ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
      }`}
    >
      <span>
        {!online && 'Offline — '}
        {pendingCount > 0
          ? `${pendingCount} invoice${pendingCount === 1 ? '' : 's'} pending sync`
          : lastError}
        {syncing && ' · syncing…'}
      </span>
      <button
        onClick={() => runSync()}
        disabled={syncing || !online}
        className="font-semibold underline disabled:opacity-50"
      >
        Retry sync
      </button>
    </div>
  )
}
