const KEY = 'invoicepro-pending-phone'

/**
 * The phone+email OTP step collects a phone number, but Supabase's email OTP
 * only sets auth.users.email — the phone never reaches the auth user. This
 * carries the typed value across the swap from the auth step to the
 * registration-details form (a full remount, not a re-render, so component
 * state alone won't survive it).
 */
export function savePendingPhone(phone: string) {
  try {
    sessionStorage.setItem(KEY, phone)
  } catch {
    // Best-effort — a blocked/private-mode session just won't have the phone pre-filled.
  }
}

export function consumePendingPhone(): string {
  try {
    const value = sessionStorage.getItem(KEY) ?? ''
    sessionStorage.removeItem(KEY)
    return value
  } catch {
    return ''
  }
}
