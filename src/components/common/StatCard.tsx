type Tone = 'primary' | 'success' | 'warning' | 'neutral'

const toneStyles: Record<Tone, { bar: string; value: string }> = {
  primary: { bar: 'bg-primary-500', value: 'text-slate-900' },
  success: { bar: 'bg-emerald-500', value: 'text-emerald-700' },
  warning: { bar: 'bg-amber-500', value: 'text-amber-700' },
  neutral: { bar: 'bg-slate-300', value: 'text-slate-900' },
}

export function StatCard({
  label,
  value,
  sublabel,
  big = false,
  tone = 'neutral',
}: {
  label: string
  value: string
  sublabel?: string
  big?: boolean
  tone?: Tone
}) {
  const styles = toneStyles[tone]
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className={`h-1 ${styles.bar}`} />
      <div className="p-5">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className={`${big ? 'mt-2 text-4xl' : 'mt-1 text-2xl'} font-bold ${styles.value}`}>{value}</p>
        {sublabel && <p className="mt-1 text-sm text-slate-500">{sublabel}</p>}
      </div>
    </div>
  )
}
