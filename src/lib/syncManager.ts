import { supabase } from '@/lib/supabase'
import { getPendingInvoices, markInvoiceSynced } from '@/lib/db'
import { useOfflineStore } from '@/store/offlineStore'

const RETRY_INTERVAL_MS = 30_000
let retryTimer: ReturnType<typeof setInterval> | null = null
let started = false

/**
 * Pushes any queued draft invoices to Supabase via the sync_invoice RPC, which
 * atomically assigns the real invoice_number and is idempotent on
 * client_generated_id — so calling this repeatedly (poll, reconnect, manual
 * retry) never creates duplicates, it just no-ops for already-synced rows.
 */
export async function runSync(): Promise<void> {
  if (!navigator.onLine) return

  const pending = await getPendingInvoices()
  useOfflineStore.getState().setPendingCount(pending.length)
  if (pending.length === 0) return

  useOfflineStore.getState().setSyncing(true)
  useOfflineStore.getState().setLastError(null)

  for (const invoice of pending) {
    try {
      const { data, error } = await supabase.rpc('sync_invoice', {
        p_client_generated_id: invoice.client_generated_id,
        p_vendor_id: invoice.vendor_id,
        p_salesman_id: invoice.salesman_id,
        p_retailer_id: invoice.retailer_id,
        p_subtotal: invoice.subtotal,
        p_total_gst: invoice.total_gst,
        p_total_amount: invoice.total_amount,
        p_is_interstate: invoice.is_interstate,
        p_items: invoice.lines.map((line) => ({
          item_id: line.item_id,
          item_name: line.item_name,
          quantity: line.quantity,
          unit_price: line.unit_price,
          gst_percent: line.gst_percent,
          line_total: line.line_total,
        })),
      })

      if (error) throw error
      if (data?.invoice_number) {
        await markInvoiceSynced(invoice.client_generated_id, data.invoice_number, data.synced_at)
      }
    } catch (err) {
      // Leave this invoice queued; surface the error and keep trying the rest.
      useOfflineStore.getState().setLastError(err instanceof Error ? err.message : 'Sync failed')
    }
  }

  const remaining = await getPendingInvoices()
  useOfflineStore.getState().setPendingCount(remaining.length)
  useOfflineStore.getState().setSyncing(false)
}

/** Call once at app startup: syncs on load, on regaining connectivity, and periodically. */
export function startSyncManager() {
  if (started) return
  started = true

  void runSync()
  window.addEventListener('online', () => void runSync())
  retryTimer = setInterval(() => void runSync(), RETRY_INTERVAL_MS)
}

export function stopSyncManager() {
  if (retryTimer) clearInterval(retryTimer)
  started = false
}
