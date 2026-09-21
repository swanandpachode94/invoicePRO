import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Loud failure beats a silent client that 401s on every call.
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.'
  )
}

// Reads exclusively from import.meta.env so swapping in real production
// credentials never requires a code change — only .env.local / host env vars.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Supabase refresh tokens are long-lived by default (project-configurable,
    // 30 days by default) — persisting + auto-refreshing keeps a logged-in user
    // signed in across sessions without a repeat OTP prompt.
    // true is required for Google OAuth (redirect carries the session in the
    // URL fragment) and for email-confirmation links to complete sign-in.
    detectSessionInUrl: true,
  },
})
