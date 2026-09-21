import { useToastStore } from '@/store/toastStore'
import { vibrateSuccess } from '@/lib/haptics'

/** Tactile + visual confirmation for save-type actions — a brief buzz plus a toast. */
export function confirmSuccess(message: string) {
  vibrateSuccess()
  useToastStore.getState().show(message)
}
