import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createOrganization } from '../lib/api.js'
import { normaliseStreetAddress, streetAddressError } from '../lib/validation.js'
import { useAuth } from '../auth/useAuth.js'
import RequireAuth from '../auth/RequireAuth.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import Field from '../components/Field.jsx'

const EMPTY = {
  name: '', orgType: '', capability: '', email: '', phone: '',
  unitNumber: '', complexName: '', streetAddress: '', suburb: '', city: '', province: '',
}

function Form() {
  const { refresh, setActiveOrgId } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const streetError = streetAddressError(form.streetAddress, { required: true })

  async function submit(e) {
    e.preventDefault()
    if (streetError) return setError(streetError)
    setBusy(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      orgType: form.orgType.toUpperCase(),
      orgCapability: form.capability,
      email: form.email.trim() || null,
      phoneNumber: form.phone.trim() || null,
      address: {
        unitNumber: form.unitNumber.trim() || null,
        complexName: form.complexName.trim() || null,
        streetAddress: normaliseStreetAddress(form.streetAddress) || null,
        suburb: form.suburb.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
      },
    }

    try {
      const created = await createOrganization(payload)
      setActiveOrgId(created.organizationId) // the creator is the admin; start working in it
      await refresh()
      navigate('/app/projects', { replace: true })
    } catch (err) {
      console.error('Error creating organisation:', err)
      setError(`Failed to create organisation: ${err.message}`)
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title="Register your organisation"
      intro="You will be set as the administrator of this organisation."
      headLink={{ to: '/app/projects', label: '← Back to the app' }}
      footer={
        <p className="auth-foot">
          Changed your mind? <Link to="/app/projects">Return to the app</Link>
        </p>
      }
    >
      <form onSubmit={submit}>
        <Field label="Organisation name">
          <input value={form.name} onChange={set('name')} placeholder="e.g. Hope Community Foundation" autoComplete="organization" required />
        </Field>
        <div className="field-row">
          <Field label="Organisation type">
            <select value={form.orgType} onChange={set('orgType')} required>
              <option value="" disabled>Select type</option>
              <option value="npo">Non-profit / NGO</option>
              <option value="religious">Religious organisation</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Organisation capability">
            <select value={form.capability} onChange={set('capability')} required>
              <option value="" disabled>Select capability</option>
              <option value="ISSUER">I issue vouchers</option>
              <option value="REDEEMER">I redeem vouchers</option>
              <option value="BOTH">I can do both</option>
            </select>
          </Field>
        </div>

        <h3 className="mt">Contact details (optional)</h3>
        <p className="muted small" style={{ margin: '4px 0 12px' }}>
          If left blank, your personal staff email and phone number are used.
        </p>
        <div className="field-row">
          <Field label="Organisation email">
            <input type="email" value={form.email} onChange={set('email')} placeholder="hello@hopecommunity.org" />
          </Field>
          <Field label="Organisation phone number">
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+27 82 123 4567" />
          </Field>
        </div>

        <h3 className="mt">Address</h3>
        <div className="field-row" style={{ marginTop: 12 }}>
          <Field label="Unit number (optional)">
            <input value={form.unitNumber} onChange={set('unitNumber')} placeholder="12" />
          </Field>
          <Field label="Complex name (optional)">
            <input value={form.complexName} onChange={set('complexName')} placeholder="The Palms" />
          </Field>
        </div>
        <Field label="Street address" hint="Street number and street name, for example 12 Mandela Way.">
          <input
            value={form.streetAddress}
            onChange={set('streetAddress')}
            placeholder="12 Mandela Way"
            maxLength={255}
            autoComplete="address-line1"
            aria-invalid={!!streetError && !!form.streetAddress}
            required
          />
        </Field>
        <div className="field-row">
          <Field label="Suburb">
            <input value={form.suburb} onChange={set('suburb')} placeholder="Randburg" />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={set('city')} placeholder="Johannesburg" />
          </Field>
          <Field label="Province">
            <input value={form.province} onChange={set('province')} placeholder="Gauteng" />
          </Field>
        </div>

        {error && <p className="message error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? 'Creating…' : 'Create organisation'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default function RegisterOrg() {
  return (
    <RequireAuth>
      <Form />
    </RequireAuth>
  )
}
