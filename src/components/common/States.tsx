import type { ReactNode } from 'react'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-700" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-red-50 py-12 px-6 text-center">
      <p className="text-red-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold text-red-800 underline">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-14 px-6 text-center">
      {icon && <div className="mb-1 text-slate-400">{icon}</div>}
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      {description && <p className="max-w-sm text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
