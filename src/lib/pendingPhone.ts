import type { User } from '@supabase/supabase-js'

const KEY = 'invoicepro-pending-phone'

/**
 * Same-device backup for the mobile number typed at signup. The primary copy
 * rides on the new auth user's metadata (EmailLinkStep passes it to
 * signInWithOtp), but Supabase only writes that for a brand-new user — someone
 * restarting an abandoned signup relies on this instead.
 */
export function savePendingPhone(phone: string) {
  try {
    sessionStorage.setItem(KEY, phone)
  } catch {
    // Best-effort — a blocked/private-mode session just won't have the phone pre-filled.
  }
}

function consumePendingPhone(): string {
  try {
    const value = sessionStorage.getItem(KEY) ?? ''
    sessionStorage.removeItem(KEY)
    return value
  } catch {
    return ''
  }
}

/**
 * The 10-digit mobile number entered at signup, wherever it ended up: user
 * metadata (survives opening the email link on another device), a phone-auth
 * user's own number, or this tab's sessionStorage. Empty for Google signups,
 * which never asked for one.
 */
export function phoneFromSignup(user: User): string {
  const fromMetadata = user.user_metadata?.phone
  if (typeof fromMetadata === 'string' && fromMetadata) return fromMetadata
  if (user.phone) return user.phone.replace(/^\+?91/, '')
  return consumePendingPhone()
}
