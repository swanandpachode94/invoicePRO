import type { InvoiceResetRule } from '@/types'

/**
 * Client-side preview only, mirroring the logic in the `invoice_period_key` /
 * `sync_invoice` Postgres functions (supabase/migrations/0003_functions.sql).
 * The real invoice_number is always assigned server-side by that RPC.
 */
export function previewInvoiceNumber(
  prefix: string,
  resetRule: InvoiceResetRule,
  nextCounter: number,
  at: Date = new Date()
): string {
  const period = periodKey(resetRule, at)
  const counterStr = String(nextCounter).padStart(5, '0')
  return period === 'never' ? `${prefix}-${counterStr}` : `${prefix}-${period}-${counterStr}`
}

function periodKey(resetRule: InvoiceResetRule, at: Date): string {
  if (resetRule === 'never') return 'never'
  if (resetRule === 'yearly') return String(at.getFullYear())

  // financial_year: Apr–Mar, e.g. Jan 2026 -> "2025-26", Jul 2026 -> "2026-27"
  const month = at.getMonth() + 1
  const year = at.getFullYear()
  if (month >= 4) {
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`
  }
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`
}
