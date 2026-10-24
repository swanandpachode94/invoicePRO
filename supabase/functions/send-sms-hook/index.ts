// Supabase Auth "Send SMS" hook — Supabase still generates and verifies the
// OTP itself (so src/components/auth/PhoneOtpStep.tsx needs zero changes);
// this function only receives the code Supabase generated and hands it to
// Fast2SMS for actual delivery. Enabling this hook makes Supabase call this
// function for every phone OTP send instead of its built-in Twilio
// integration — the Twilio "Message Service SID" field becomes irrelevant.
//
// Deploy: supabase functions deploy send-sms-hook --no-verify-jwt
// Secrets (server-side only, never in the frontend .env):
//   supabase secrets set FAST2SMS_API_KEY=<your Fast2SMS Dev API auth key>
//   supabase secrets set SEND_SMS_HOOK_SECRET=<the secret Supabase shows you
//     when you enable this hook in Dashboard -> Authentication -> Hooks>
//
// The payload shape and signature headers below follow Supabase's documented
// Auth Hooks contract (Standard Webhooks spec) as of when this was written —
// worth a quick diff against Supabase's current Auth Hooks docs if this
// function doesn't fire as expected, in case the contract has since changed.

import { Webhook } from 'npm:standardwebhooks@1'

const FAST2SMS_API_KEY = Deno.env.get('FAST2SMS_API_KEY')!
const HOOK_SECRET = Deno.env.get('SEND_SMS_HOOK_SECRET')!

Deno.serve(async (req) => {
  const payload = await req.text()

  // Verifies this request genuinely came from Supabase (signed with the hook
  // secret), not an arbitrary caller trying to make this project send SMS on
  // its own dime.
  try {
    const wh = new Webhook(HOOK_SECRET)
    wh.verify(payload, Object.fromEntries(req.headers))
  } catch {
    return new Response(JSON.stringify({ error: { http_code: 401, message: 'Invalid signature' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { user, sms } = JSON.parse(payload) as {
    user: { phone?: string }
    sms: { otp: string }
  }

  const phone = (user.phone ?? '').replace(/^\+?91/, '') // Fast2SMS's OTP route wants the bare 10-digit number, no country code.
  if (!phone || !sms?.otp) {
    return new Response(JSON.stringify({ error: { http_code: 400, message: 'Missing phone or otp' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      authorization: FAST2SMS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      route: 'otp',
      variables_values: sms.otp,
      numbers: phone,
    }),
  })

  const result = await res.json().catch(() => null)

  if (!res.ok || result?.return !== true) {
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: `Fast2SMS send failed: ${JSON.stringify(result)}` } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
