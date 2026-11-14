// Helpers for the email-confirmation and Google sign-in flows. Everything here talks to Supabase Auth through supabase.js, so a later
// move to another provider only changes this file and supabase.js.
import { supabase } from './supabase.js'
import { config } from '../config.js'

/** Where confirmation links and Google bring the browser back to. It must be allowed in Supabase's redirect URL list. */
export const callbackUrl = () => `${window.location.origin}/auth/callback`

/** Sends the sign-up confirmation email again. */
export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: callbackUrl() } })
  if (error) throw error
}

/** Sends the "confirm your new email" message again for a pending email change. */
export async function resendEmailChange(newEmail) {
  const { error } = await supabase.auth.resend({ type: 'email_change', email: newEmail, options: { emailRedirectTo: callbackUrl() } })
  if (error) throw error
}

/** Takes the browser to Google; it comes back to /auth/callback signed in. */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl() } })
  if (error) throw error
}

let providers
/** Which sign-in providers the auth server has switched on ({ google: true, ... }); empty if it cannot be read. */
export function externalProviders() {
  if (!providers) {
    const { url, anonKey } = config.supabase
    providers = fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } })
      .then((r) => (r.ok ? r.json() : {}))
      .then((s) => s.external || {})
      .catch(() => ({}))
  }
  return providers
}

/** What the sign-up form stored on the account, or what Google knows (given_name / family_name / full_name). */
export function profileFromUser(user) {
  const m = user?.user_metadata || {}
  const full = (m.full_name || m.name || '').trim()
  const [firstGuess, ...rest] = full.split(/\s+/).filter(Boolean)
  return {
    firstName: (m.firstName || m.given_name || firstGuess || '').trim(),
    lastName: (m.lastName || m.family_name || rest.join(' ') || '').trim(),
    phoneNumber: (m.phoneNumber || '').trim(),
  }
}

/** True when the account can sign in with an email and password (not only through Google). */
export const hasPasswordLogin = (user) => (user?.identities || []).some((i) => i.provider === 'email')

export const isEmailNotConfirmed = (err) => err?.code === 'email_not_confirmed' || /not confirmed/i.test(err?.message || '')
