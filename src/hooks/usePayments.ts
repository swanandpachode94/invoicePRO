import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { InvoicePayment } from '@/types'
import { summarizePayments } from '@/lib/payments'

const POLL_MS = 45_000

/** All-time received/pending across a salesman's own synced invoices. */
export function useSalesmanPaymentStats(salesmanId: string | undefined) {
  return useQuery({
    queryKey: ['salesman-payment-stats', salesmanId],
    enabled: !!salesmanId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('total_amount, status, invoice_payments(amount)')
        .eq('salesman_id', salesmanId!)
        .neq('status', 'cancelled')
      if (error) throw error
      return summarizePayments(data as { total_amount: number; invoice_payments: { amount: number }[] | null }[])
    },
    refetchInterval: POLL_MS,
  })
}

export function useInvoicePayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-payments', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as InvoicePayment[]
    },
  })
}

/** Resolves a locally-known client_generated_id to its real server invoice id, needed for anything (payments, cancellations) that references invoices.id directly. */
export function useServerInvoiceId(clientGeneratedId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['server-invoice-id', clientGeneratedId],
    enabled: enabled && !!clientGeneratedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_generated_id', clientGeneratedId!)
        .single()
      if (error) throw error
      return data.id as string
    },
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, amount, note }: { invoiceId: string; amount: number; note?: string }) => {
      const { error } = await supabase.from('invoice_payments').insert({ invoice_id: invoiceId, amount, note: note || null })
      if (error) throw error
    },
    onSuccess: (_data, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: ['invoice-payments', invoiceId] })
      qc.invalidateQueries({ queryKey: ['vendor-invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['salesman-payment-stats'] })
    },
  })
}
