import { useEffect, useState } from 'react'
import { resendConfirmation } from '../lib/authFlow.js'

const COOLDOWN_SECONDS = 60

/** "Check your email": shown after sign-up until the address is confirmed, with a resend (limited to once a minute). */
export default function CheckEmail({ email, onChangeAddress }) {
  const [seconds, setSeconds] = useState(COOLDOWN_SECONDS) // the first email was only just sent
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (seconds <= 0) return undefined
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  async function resend() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await resendConfirmation(email)
      setMessage('We sent it again.')
      setSeconds(COOLDOWN_SECONDS)
    } catch (err) {
      setError(err.message || 'Could not send the email. Please try again in a minute.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p>
        We sent a confirmation link to <strong>{email}</strong>. Open it to finish creating your account. It can take a minute, and
        it may be in your spam folder.
      </p>
      {message && <p className="message" role="status">{message}</p>}
      {error && <p className="message error" role="alert">{error}</p>}
      <div className="row mt">
        <button type="button" className="btn btn-ghost" disabled={busy || seconds > 0} onClick={resend}>
          {seconds > 0 ? `Send it again (${seconds}s)` : 'Send it again'}
        </button>
        {onChangeAddress && <button type="button" className="link-btn" onClick={onChangeAddress}>Use a different address</button>}
      </div>
    </div>
  )
}
