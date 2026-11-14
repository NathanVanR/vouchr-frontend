// After a deploy the old hashed files (assets/Login-abc123.js) are gone, so a page that was opened before it can fail to load the
// next screen. The cure is simply to reload and get the new version. Do it once automatically; the guard stops a reload loop if the
// problem is something else (offline, blocked file).
const KEY = 'vouchr:stale-reload'
const WINDOW_MS = 30 * 1000

export function isStaleChunkError(error) {
  const text = String(error?.message || error || '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(text)
}

/** True when the page already reloaded for this reason a moment ago (or storage is unavailable): do not reload again. */
export function reloadedRecently() {
  try {
    return Date.now() - Number(sessionStorage.getItem(KEY) || 0) < WINDOW_MS
  } catch {
    return true // no storage: do not risk a loop
  }
}

/** Reloads the page unless it already did so a moment ago. Returns true when a reload was started. */
export function reloadForNewVersion() {
  if (reloadedRecently()) return false
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
