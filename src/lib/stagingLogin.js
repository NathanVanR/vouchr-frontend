// STAGING only. The staging API lists its made-up staff and hands back a session for one of them; we store it
// exactly where the auth client keeps a real session, then reload so the app picks it up.
import { config } from '../config.js'
import { storageKey } from './supabase.js'

async function call(path, options) {
  const res = await fetch(`${config.apiBaseUrl}/api/staging${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`Staging server said ${res.status}. It may still be waking up, try again in a few seconds.`)
  return res.json()
}

export const listTestUsers = () => call('/users')

export async function loginAsTestUser(email) {
  const session = await call('/login', { method: 'POST', body: JSON.stringify({ email }) })
  localStorage.setItem(storageKey, JSON.stringify(session))
  window.location.assign('/app/projects')
}
