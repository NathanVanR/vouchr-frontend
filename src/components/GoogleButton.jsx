import { useState } from 'react'
import { signInWithGoogle } from '../lib/authFlow.js'
import { useGoogleEnabled } from '../hooks/useGoogleEnabled.js'

/** "Continue with Google", shown only when Google sign-in is switched on. Followed by an "or" line, so put it above the form. */
export default function GoogleButton({ label = 'Continue with Google' }) {
  const enabled = useGoogleEnabled()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!enabled) return null

  async function go() {
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle() // the browser leaves for Google
    } catch (err) {
      setError(err.message || 'Could not start Google sign-in.')
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={go}>
        {busy ? 'Opening Google…' : label}
      </button>
      {error && <p className="message error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
      <p className="muted center small" style={{ margin: '14px 0 0' }}>or use your email</p>
    </div>
  )
}
