import { round2 } from '@/lib/gst'

export interface PaymentTotals {
  totalAmount: number
  totalReceived: number
  totalPending: number
  invoiceCount: number
}

interface InvoiceWithPayments {
  total_amount: number
  invoice_payments: { amount: number }[] | null
}

/** Received/pending are always derived from the invoice_payments ledger, never stored redundantly. */
export function summarizePayments(rows: InvoiceWithPayments[]): PaymentTotals {
  let totalAmount = 0
  let totalReceived = 0
  for (const row of rows) {
    totalAmount += Number(row.total_amount)
    totalReceived += (row.invoice_payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  }
  return {
    totalAmount: round2(totalAmount),
    totalReceived: round2(totalReceived),
    totalPending: round2(Math.max(0, totalAmount - totalReceived)),
    invoiceCount: rows.length,
  }
}
