import { useEffect, useState } from 'react'
import { listTestUsers, loginAsTestUser } from '../lib/stagingLogin.js'
import AuthLayout from '../components/AuthLayout.jsx'

/** Staging only: pick one of the made-up staff to sign in as. No passwords, no real accounts. */
export default function StagingLogin() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    listTestUsers().then(setUsers, (err) => setError(err.message))
  }, [])

  async function pick(email) {
    setBusy(email)
    setError('')
    try {
      await loginAsTestUser(email)
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  return (
    <AuthLayout title="Staging" intro="This is the test copy of Vouchr. Everything here is made up. Pick a test user to sign in as.">
      {error && <p className="message error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
      {!users && !error && <p className="muted">Loading test users…</p>}
      {users?.map((u) => (
        <button key={u.email} type="button" className="btn btn-block" style={{ marginBottom: 10 }} disabled={!!busy} onClick={() => pick(u.email)}>
          {busy === u.email ? 'Signing in…' : `${u.name} (${u.email})`}
        </button>
      ))}
    </AuthLayout>
  )
}
