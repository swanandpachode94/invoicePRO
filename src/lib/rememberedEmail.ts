const KEY = 'invoicepro-last-email'

/** Prefills the email field on this device next time — a convenience only, never relied on. */
export function rememberEmail(email: string) {
  try {
    localStorage.setItem(KEY, email)
  } catch {
    // Private mode / blocked storage: the field just starts empty.
  }
}

export function getRememberedEmail(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}
