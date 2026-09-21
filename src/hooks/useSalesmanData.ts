import { useEffect, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import {
  cacheItems,
  cacheRetailers,
  getCachedItems,
  getCachedRetailers,
  addCachedRetailer,
  getLocalInvoices,
  getLocalInvoiceById,
  saveLocalInvoice,
} from '@/lib/db'
import type { Item, Retailer, DraftInvoice, Invoice, GstSlab } from '@/types'
import { useOnlineStatus } from './useOnlineStatus'

/**
 * Loads the vendor's item catalog + retailer list from IndexedDB immediately
 * (so the create-invoice screen is usable with zero network), then refreshes
 * from Supabase in the background whenever online and re-caches the result.
 */
export function useCatalog(vendorId: string | undefined) {
  const [items, setItems] = useState<Item[]>([])
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [loading, setLoading] = useState(true)
  const online = useOnlineStatus()

  const loadFromCache = useCallback(async () => {
    if (!vendorId) return
    const [cachedItems, cachedRetailers] = await Promise.all([
      getCachedItems(vendorId),
      getCachedRetailers(vendorId),
    ])
    setItems(cachedItems.filter((i) => i.active))
    setRetailers(cachedRetailers)
  }, [vendorId])

  const refreshFromServer = useCallback(async () => {
    if (!vendorId || !navigator.onLine) return
    const [{ data: freshItems }, { data: freshRetailers }] = await Promise.all([
      supabase.from('items').select('*').eq('vendor_id', vendorId),
      supabase.from('retailers').select('*').eq('vendor_id', vendorId),
    ])
    if (freshItems) await cacheItems(freshItems as Item[])
    if (freshRetailers) await cacheRetailers(freshRetailers as Retailer[])
    await loadFromCache()
  }, [vendorId, loadFromCache])

  useEffect(() => {
    setLoading(true)
    loadFromCache().finally(() => setLoading(false))
  }, [loadFromCache])

  useEffect(() => {
    if (online) void refreshFromServer()
  }, [online, refreshFromServer])

  const quickAddRetailer = useCallback(
    async (input: { name: string; gstin: string | null; state: string; phone: string | null }) => {
      if (!vendorId) throw new Error('No vendor')

      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('retailers')
          .insert({ vendor_id: vendorId, ...input })
          .select()
          .single()
        if (error) throw error
        await addCachedRetailer(data as Retailer)
        setRetailers((prev) => [...prev, data as Retailer])
        return data as Retailer
      }

      // Offline: usable immediately for this invoice; synced to the server
      // next time a vendor/salesman action runs online (documented limitation
      // in README — retailer creation itself isn't queued like invoices are).
      const localRetailer: Retailer = {
        id: uuidv4(),
        vendor_id: vendorId,
        created_at: new Date().toISOString(),
        ...input,
      }
      await addCachedRetailer(localRetailer)
      setRetailers((prev) => [...prev, localRetailer])
      return localRetailer
    },
    [vendorId]
  )

  return { items, retailers, loading, refresh: refreshFromServer, quickAddRetailer }
}

/** Local invoice history — the single source of truth so it reads instantly offline. */
export function useLocalInvoices(salesmanId: string | undefined) {
  const [invoices, setInvoices] = useState<DraftInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const online = useOnlineStatus()

  const load = useCallback(async () => {
    const all = await getLocalInvoices()
    setInvoices(salesmanId ? all.filter((i) => i.salesman_id === salesmanId) : all)
  }, [salesmanId])

  const pullFromServer = useCallback(async () => {
    if (!salesmanId || !navigator.onLine) return
    const { data } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), retailers(name)')
      .eq('salesman_id', salesmanId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (!data) return

    interface ServerInvoiceItem {
      item_id: string | null
      item_name: string
      quantity: number
      unit_price: number
      gst_percent: GstSlab
      line_total: number
    }
    interface ServerInvoice extends Invoice {
      retailers: { name: string } | null
      invoice_items: ServerInvoiceItem[] | null
    }

    for (const inv of data as unknown as ServerInvoice[]) {
      const draft: DraftInvoice = {
        client_generated_id: inv.client_generated_id,
        vendor_id: inv.vendor_id,
        salesman_id: inv.salesman_id,
        retailer_id: inv.retailer_id,
        retailer_name: inv.retailers?.name ?? '',
        lines: (inv.invoice_items ?? []).map((li) => ({
          item_id: li.item_id,
          item_name: li.item_name,
          quantity: Number(li.quantity),
          unit_price: Number(li.unit_price),
          gst_percent: li.gst_percent,
          line_total: Number(li.line_total),
        })),
        subtotal: Number(inv.subtotal),
        total_gst: Number(inv.total_gst),
        total_amount: Number(inv.total_amount),
        is_interstate: inv.is_interstate,
        status: inv.status,
        invoice_number: inv.invoice_number,
        created_at: inv.created_at,
        synced_at: inv.synced_at,
      }
      await saveLocalInvoice(draft)
    }
    await load()
  }, [salesmanId, load])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  useEffect(() => {
    if (online) void pullFromServer()
  }, [online, pullFromServer])

  return { invoices, loading, refresh: load }
}

/** A single invoice by its client_generated_id — the URL param used across salesman routes. */
export function useLocalInvoice(clientGeneratedId: string | undefined) {
  const [invoice, setInvoice] = useState<DraftInvoice | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clientGeneratedId) return
    const row = await getLocalInvoiceById(clientGeneratedId)
    setInvoice(row)
  }, [clientGeneratedId])

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [load])

  return { invoice, loading, refresh: load }
}
