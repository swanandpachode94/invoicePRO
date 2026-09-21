import type { DraftInvoiceLine, GstSlab } from '@/types'

export const GST_SLABS: GstSlab[] = [0, 5, 12, 18, 28]

export interface LineTotals {
  lineTotal: number
  gstAmount: number
}

/** Line total is price * qty; GST is computed on top (exclusive pricing). */
export function calculateLine(unitPrice: number, quantity: number, gstPercent: GstSlab): LineTotals {
  const base = unitPrice * quantity
  const gstAmount = (base * gstPercent) / 100
  return { lineTotal: round2(base), gstAmount: round2(gstAmount) }
}

export interface InvoiceTotals {
  subtotal: number
  totalGst: number
  totalAmount: number
  cgst: number
  sgst: number
  igst: number
}

/**
 * CGST+SGST (split evenly) when retailer and vendor share a state, otherwise IGST
 * on the full GST amount — the standard Indian intra-state vs inter-state GST split.
 */
export function calculateInvoiceTotals(lines: DraftInvoiceLine[], isInterstate: boolean): InvoiceTotals {
  let subtotal = 0
  let totalGst = 0

  for (const line of lines) {
    const { lineTotal, gstAmount } = calculateLine(line.unit_price, line.quantity, line.gst_percent)
    subtotal += lineTotal
    totalGst += gstAmount
  }

  subtotal = round2(subtotal)
  totalGst = round2(totalGst)
  const totalAmount = round2(subtotal + totalGst)

  return {
    subtotal,
    totalGst,
    totalAmount,
    cgst: isInterstate ? 0 : round2(totalGst / 2),
    sgst: isInterstate ? 0 : round2(totalGst / 2),
    igst: isInterstate ? totalGst : 0,
  }
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Formats a number in Indian numbering (lakhs/crores comma grouping), e.g. ₹1,25,000.00 */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatInrCompactNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN').format(amount)
}
