import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { getMe } from '../lib/api.js'
import { useAuth } from '../auth/useAuth.js'
import AuthLayout from '../components/AuthLayout.jsx'
import Field from '../components/Field.jsx'
import PasswordField from '../components/PasswordField.jsx'

export default function Login() {
  const { status, refresh } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (status === 'authed') return <Navigate to={location.state?.from || '/app/projects'} replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) throw signInError

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
        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
