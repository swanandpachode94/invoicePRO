import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'

const AUTO_DISMISS_MS = 2200

export function Toast() {
  const { message, clear } = useToastStore()

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(clear, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [message, clear])

  if (!message) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        {message}
      </div>
    </div>
  )
}
