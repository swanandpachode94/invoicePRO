import { create } from 'zustand'

interface OfflineState {
  pendingCount: number
  syncing: boolean
  lastError: string | null
  setPendingCount: (n: number) => void
  setSyncing: (s: boolean) => void
  setLastError: (e: string | null) => void
}

/** Local-only sync status, read by the sync-status indicator and the manual retry button. */
export const useOfflineStore = create<OfflineState>((set) => ({
  pendingCount: 0,
  syncing: false,
  lastError: null,
  setPendingCount: (n) => set({ pendingCount: n }),
  setSyncing: (s) => set({ syncing: s }),
  setLastError: (e) => set({ lastError: e }),
}))
