// Only Supabase Auth is used (the data lives in the Vouchr API), so this talks to GoTrue through @supabase/auth-js
// instead of the full supabase-js client, which also bundles realtime, storage and database code we never call.
// The URL layout and the storage key match what supabase-js would use, so people who are already signed in on the
// old site stay signed in.
import { GoTrueClient } from '@supabase/auth-js'
import { config } from '../config.js'

const { url, anonKey } = config.supabase

/** An error carried in the page address by a link (e.g. an expired confirmation), read before the auth client clears the URL. */
function readUrlError() {
  try {
    const params = new URLSearchParams(`${window.location.hash.replace(/^#/, '')}&${window.location.search.replace(/^\?/, '')}`)
    return params.get('error_description') || params.get('error') || null
  } catch {
    return null
  }
}
export const urlError = readUrlError()

export const supabase = {
  auth: new GoTrueClient({
    url: `${url}/auth/v1`,
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
    storageKey: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }),
}

/** Fresh access token from the current session (refreshed automatically when it has expired). */
export async function getAccessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
