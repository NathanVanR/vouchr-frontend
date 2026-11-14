import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getMe } from '../lib/api.js'
import { isEmailNotConfirmed, resendConfirmation } from '../lib/authFlow.js'
import { useAuth } from '../auth/useAuth.js'
import AuthLayout from '../components/AuthLayout.jsx'
import Field from '../components/Field.jsx'
import GoogleButton from '../components/GoogleButton.jsx'
import PasswordField from '../components/PasswordField.jsx'

export default function Login() {
  const { status, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resent, setResent] = useState('')

  if (status === 'authed') return <Navigate to={location.state?.from || '/app/projects'} replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setUnconfirmed(false)
    setResent('')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) {
        if (isEmailNotConfirmed(signInError)) {
          setUnconfirmed(true)
          setError('You need to confirm your email address before you can sign in. Check your inbox for the link we sent.')
          return
        }
        throw signInError
      }

      let profile
      try {
        profile = await getMe()
      } catch (err) {
        if (err.status === 404 || err.status === 403) {
          // signed up with Supabase but never finished creating the staff profile
          navigate('/register', { replace: true })
          return
        }
        throw new Error('Could not load your profile. Please try again.', { cause: err })
      }
      if (profile.role !== 'STAFF') {
        await supabase.auth.signOut()
        throw new Error('This account is not a staff account.')
      }
      await refresh()
      navigate(location.state?.from || '/app/projects', { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    setResent('')
    try {
      await resendConfirmation(email.trim())
      setResent('We sent the confirmation link again.')
    } catch (err) {
      setError(err.message || 'Could not send the email. Please try again in a minute.')
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      intro="Sign in to your organisation's Vouchr account."
      headLink={{ to: '/register', label: 'Create account' }}
      footer={
        <p className="auth-foot">
          Don&apos;t have an account? <Link to="/register">Create one</Link>
        </p>
      }
    >
      <GoogleButton />
      <form onSubmit={submit}>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@organisation.org"
            autoComplete="email"
            required
          />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p className="message error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
        {unconfirmed && (
          <p style={{ marginBottom: 14 }}>
            <button type="button" className="link-btn" onClick={resend}>Send the confirmation link again</button>
            {resent && <span className="muted small"> {resent}</span>}
          </p>
        )}
        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
