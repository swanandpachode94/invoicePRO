import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Item, Retailer, Salesman, Invoice, InvoiceCancellation, GstSlab, InvoiceResetRule } from '@/types'
import type { ItemInput } from '@/lib/validation'
import { summarizePayments } from '@/lib/payments'

const DASHBOARD_POLL_MS = 45_000

export function useSalesmen(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['salesmen', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salesmen')
        .select('*')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Salesman[]
    },
    refetchInterval: DASHBOARD_POLL_MS,
  })
}

export function useUpdateSalesmanStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Salesman['status'] }) => {
      const { error } = await supabase.from('salesmen').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salesmen'] }),
  })
}

export function useItems(vendorId: string | undefined, includeInactive = true) {
  return useQuery({
    queryKey: ['items', vendorId, includeInactive],
    enabled: !!vendorId,
    queryFn: async () => {
      let query = supabase.from('items').select('*').eq('vendor_id', vendorId!).order('name')
      if (!includeInactive) query = query.eq('active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Item[]
    },
  })
}

export function useUpsertItem(vendorId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ItemInput }) => {
      const payload = {
        vendor_id: vendorId,
        name: values.name,
        sku: values.sku || null,
        hsn_code: values.hsn_code || null,
        unit: values.unit,
        sale_price: values.sale_price,
        gst_percent: values.gst_percent as GstSlab,
      }
      const { error } = id
        ? await supabase.from('items').update(payload).eq('id', id)
        : await supabase.from('items').insert(payload)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
}

export function useToggleItemActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('items').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
}

export function useRetailers(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['retailers', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('vendor_id', vendorId!)
        .order('name')
      if (error) throw error
      return data as Retailer[]
    },
  })
}

export interface InvoiceFilters {
  salesmanId?: string
  retailerId?: string
  fromDate?: string
  toDate?: string
}

export function useVendorInvoices(vendorId: string | undefined, filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: ['vendor-invoices', vendorId, filters],
    enabled: !!vendorId,
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, retailers(name), salesmen(name), invoice_payments(amount)')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false })

      if (filters.salesmanId) query = query.eq('salesman_id', filters.salesmanId)
      if (filters.retailerId) query = query.eq('retailer_id', filters.retailerId)
      if (filters.fromDate) query = query.gte('created_at', filters.fromDate)
      if (filters.toDate) query = query.lte('created_at', filters.toDate)

      const { data, error } = await query.limit(500)
      if (error) throw error
      return data as (Invoice & {
        retailers: { name: string } | null
        salesmen: { name: string } | null
        invoice_payments: { amount: number }[] | null
      })[]
    },
    refetchInterval: DASHBOARD_POLL_MS,
  })
}

export interface DateRange {
  from: string
  to: string
}

export function useDashboardStats(vendorId: string | undefined, range: DateRange) {
  const invoicesQuery = useVendorInvoices(vendorId, { fromDate: range.from, toDate: range.to })

  return useQuery({
    queryKey: ['dashboard-stats', vendorId, range, invoicesQuery.dataUpdatedAt],
    enabled: !!vendorId && !!invoicesQuery.data,
    queryFn: async () => {
      const invoices = (invoicesQuery.data ?? []).filter((i) => i.status !== 'cancelled')

      const bySalesman = new Map<string, { name: string; count: number; total: number }>()
      for (const inv of invoices) {
        const name = inv.salesmen?.name ?? 'Unknown'
        const entry = bySalesman.get(inv.salesman_id) ?? { name, count: 0, total: 0 }
        entry.count += 1
        entry.total += Number(inv.total_amount)
        bySalesman.set(inv.salesman_id, entry)
      }

      return {
        ...summarizePayments(invoices),
        bySalesman: [...bySalesman.values()].sort((a, b) => b.total - a.total),
        recent: invoices.slice(0, 20),
      }
    },
    refetchInterval: DASHBOARD_POLL_MS,
  })
}

export function useItemSalesBreakdown(vendorId: string | undefined, range?: DateRange) {
  return useQuery({
    queryKey: ['item-sales-breakdown', vendorId, range],
    enabled: !!vendorId,
    queryFn: async () => {
      let query = supabase
        .from('invoice_items')
        .select('item_name, quantity, line_total, invoices!inner(vendor_id, status, created_at)')
        .eq('invoices.vendor_id', vendorId!)
        .neq('invoices.status', 'cancelled')
      if (range) query = query.gte('invoices.created_at', range.from).lte('invoices.created_at', range.to)

      const { data, error } = await query
      if (error) throw error

      const byItem = new Map<string, { name: string; quantity: number; total: number }>()
      for (const row of data as unknown as { item_name: string; quantity: number; line_total: number }[]) {
        const entry = byItem.get(row.item_name) ?? { name: row.item_name, quantity: 0, total: 0 }
        entry.quantity += Number(row.quantity)
        entry.total += Number(row.line_total)
        byItem.set(row.item_name, entry)
      }
      return [...byItem.values()].sort((a, b) => b.total - a.total)
    },
    refetchInterval: DASHBOARD_POLL_MS,
  })
}

export function useCancellationRequests(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['cancellations', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_cancellations')
        .select('*, invoices!inner(vendor_id, invoice_number, total_amount)')
        .eq('invoices.vendor_id', vendorId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (InvoiceCancellation & {
        invoices: { invoice_number: string | null; total_amount: number }
      })[]
    },
  })
}

export function useUpdateVendorSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      vendorId,
      invoice_prefix,
      invoice_reset_rule,
    }: {
      vendorId: string
      invoice_prefix: string
      invoice_reset_rule: InvoiceResetRule
    }) => {
      const { error } = await supabase
        .from('vendors')
        .update({ invoice_prefix, invoice_reset_rule })
        .eq('id', vendorId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor'] }),
  })
}

export function useReopenCancellation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('reopen_cancellation', { p_cancellation_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cancellations'] })
      qc.invalidateQueries({ queryKey: ['vendor-invoices'] })
    },
  })
}

export function useReviewCancellation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc('review_cancellation', {
        p_cancellation_id: id,
        p_approve: approve,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cancellations'] })
      qc.invalidateQueries({ queryKey: ['vendor-invoices'] })
    },
  })
}
