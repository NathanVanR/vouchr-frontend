import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import { supabase } from '../lib/supabase.js'
import { registerStaff } from '../lib/api.js'
import { isValidPhone } from '../lib/validation.js'
import { useAuth } from '../auth/useAuth.js'
import AuthLayout from '../components/AuthLayout.jsx'
import Field from '../components/Field.jsx'
import PasswordField from '../components/PasswordField.jsx'

// Staff accounts only. People who receive help are registered by staff inside an organisation.
export default function Register() {
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (!isValidPhone(phone)) return setError('Please enter a valid phone number.')

    setBusy(true)
    const email = form.email.trim()
    try {
      let accessToken
      let authUserId

      const { data: signUp, error: signUpError } = await supabase.auth.signUp({ email, password: form.password })
      if (signUpError) {
        const msg = (signUpError.message || '').toLowerCase()
        const alreadyRegistered = msg.includes('already') || msg.includes('registered') || signUpError.status === 422
        if (!alreadyRegistered) throw signUpError

        // The Supabase account exists (maybe from an unfinished registration): sign in and finish the staff profile.
        const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password: form.password })
        if (signInError) throw signInError
        if (!signIn.session) throw new Error('Sign-in succeeded but no session was returned.')
        accessToken = signIn.session.access_token
        authUserId = signIn.user.id
      } else {
        if (!signUp.session) throw new Error('No session returned. Check that GOTRUE_MAILER_AUTOCONFIRM=true is set.')
        accessToken = signUp.session.access_token
        authUserId = signUp.user.id
      }

      await registerStaff(
        { authUserId, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email, phoneNumber: phone },
        accessToken,
      )
      await refresh()
      navigate('/app/projects', { replace: true })
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Create your staff account"
      intro="For people who work or volunteer at an organisation. People who receive help do not need an account: staff register them inside their organisation."
      headLink={{ to: '/login', label: 'Already have an account?' }}
      footer={
        <>
          <p className="auth-foot">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <p className="auth-foot">After signing up you can register your organisation from the menu.</p>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className="field-row">
          <Field label="First name">
            <input value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
          </Field>
          <Field label="Last name">
            <input value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
          </Field>
        </div>
        <Field label="Email">
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" required />
        </Field>
        <div className="field">
          <label>Phone number</label>
          <PhoneInput
            defaultCountry="za"
            value={phone}
            onChange={setPhone}
            preferredCountries={['za', 'bw', 'na', 'sz', 'ls', 'zw', 'mz']}
            inputProps={{ 'aria-label': 'Phone number', autoComplete: 'tel' }}
          />
        </div>
        <PasswordField label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" minLength={6} />
        <PasswordField label="Confirm password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} autoComplete="new-password" minLength={6} />
        {error && <p className="message error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
