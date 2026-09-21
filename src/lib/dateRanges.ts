export type PeriodKey = 'today' | 'month' | 'last3months' | 'year' | 'custom'

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'month', label: 'This month' },
  { key: 'last3months', label: 'Last 3 months' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom range' },
]

const DAY_MS = 86_400_000

/** `to` is always exclusive-end-of-day, so a filter's last day is fully included. */
export function computeRange(key: PeriodKey, custom?: { from: string; to: string }): { from: string; to: string } {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfDay.getTime() + DAY_MS)

  switch (key) {
    case 'today':
      return { from: startOfDay.toISOString(), to: endOfToday.toISOString() }
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: endOfToday.toISOString() }
    case 'last3months':
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(), to: endOfToday.toISOString() }
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to: endOfToday.toISOString() }
    case 'custom': {
      if (!custom?.from || !custom?.to) return { from: startOfDay.toISOString(), to: endOfToday.toISOString() }
      return {
        from: new Date(custom.from).toISOString(),
        to: new Date(new Date(custom.to).getTime() + DAY_MS).toISOString(),
      }
    }
  }
}
