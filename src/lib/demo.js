// Demo mode (started from /demo): sample data, no auth, no network. The flag lives in sessionStorage so it is
// per tab and never touches a real login.
export function isDemo() {
  try {
    return sessionStorage.getItem('vouchrDemo') === '1'
  } catch {
    return false
  }
}

/** Fresh sample data every time the demo starts. */
export function startDemoMode() {
  try {
    sessionStorage.removeItem('vouchrDemoState')
    sessionStorage.setItem('vouchrDemo', '1')
  } catch {
    /* demo still runs without storage for this page */
  }
}

/** Leaves demo mode (a full reload, so no demo data stays in memory) and returns to the home page. */
export function exitDemoMode() {
  try {
    sessionStorage.removeItem('vouchrDemo')
    sessionStorage.removeItem('vouchrDemoState')
  } catch {
    /* nothing to clear */
  }
  window.location.href = '/'
}
