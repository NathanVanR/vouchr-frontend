// A signed-in account that has no staff profile yet (a Google sign-in, or a sign-up whose details did not come through the email
// step). Name is pre-filled where we know it; the email is the confirmed one on the account and cannot be changed here.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import { supabase } from '../lib/supabase.js'
import { registerStaff } from '../lib/api.js'
import { profileFromUser } from '../lib/authFlow.js'
import { isValidPhone } from '../lib/validation.js'
import { useAuth } from '../auth/useAuth.js'
import AuthLayout from '../components/AuthLayout.jsx'
import Field from '../components/Field.jsx'
import { Splash } from '../components/Skeleton.jsx'

export default function FinishProfile() {
  const { refresh, logout } = useAuth()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({ firstName: '', lastName: '' })
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    supabase.auth.getUser().then(({ data }) => {
      if (!live || !data.user) return
      const known = profileFromUser(data.user)
      setUser(data.user)
      setForm({ firstName: known.firstName, lastName: known.lastName })
      setPhone(known.phoneNumber)
    })
    return () => { live = false }
  }, [])

  if (!user) return <Splash />

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Enter your first name and last name.')
    if (!isValidPhone(phone)) return setError('Please enter a valid phone number.')
    setBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      await registerStaff(
        { authUserId: user.id, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: user.email, phoneNumber: phone },
        data.session?.access_token,
      )
      await refresh()
      navigate('/app/projects', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not finish your profile. Please try again.')
    } finally {
      setBusy(false)
    }
    return undefined
  }

  return (
    <AuthLayout
      title="Finish your profile"
      intro="Just a few details so your organisation knows who you are."
      footer={<p className="auth-foot"><button type="button" className="link-btn" onClick={logout}>Sign out</button></p>}
    >
      <form onSubmit={submit}>
        <div className="field-row">
          <Field label="First name">
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" required />
          </Field>
          <Field label="Last name">
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" required />
          </Field>
        </div>
        <Field label="Email" hint="The address you signed in with.">
          <input type="email" value={user.email || ''} readOnly />
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
        {error && <p className="message error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
        <button type="submit" className="btn btn-block" disabled={busy}>{busy ? 'Saving…' : 'Finish'}</button>
      </form>
    </AuthLayout>
  )
}
