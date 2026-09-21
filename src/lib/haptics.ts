/** Short confirmation buzz on save-type actions. Silently no-ops where unsupported (iOS Safari, desktop). */
export function vibrateSuccess() {
  try {
    navigator.vibrate?.(15)
  } catch {
    // Vibration API can throw in some embedded/locked-down webviews — never worth surfacing.
  }
}
