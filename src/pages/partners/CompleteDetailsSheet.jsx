// A partner completes the missing details of someone another organisation registered. Only the missing fields are shown, and
// the server refuses anything else. The person is not shown again once this is submitted.
import { useState } from 'react'
import { completeProfileRequest } from '../../lib/api.js'
import { todayIso } from '../../lib/format.js'
import {
  STREET_ADDRESS_MESSAGE, dateOfBirthFromSaId, dateOfBirthMatchesId, isValidSaId, isValidStreetAddress, normaliseStreetAddress,
} from '../../lib/validation.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import Field from '../../components/Field.jsx'
import Sheet from '../../components/Sheet.jsx'

const GENDERS = ['MALE', 'FEMALE', 'OTHER']

export default function CompleteDetailsSheet({ orgId, request, onClose }) {
  const missing = new Set(request.missingFields || [])
  const [f, setF] = useState({
    gender: '', dateOfBirth: '', idNumber: '', phoneNumber: '', school: '',
    unitNumber: '', complexName: '', streetAddress: '', suburb: '', city: '', province: '',
  })
  const [error, setError] = useState('')
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value })

  const submit = useApiMutation((payload) => completeProfileRequest(request.requestId, payload), {
    invalidate: [['profile-requests-org', orgId]],
    success: 'Details saved. Thank you.',
    quiet: true,
  })

  function build() {
    const t = (k) => f[k].trim()
    const payload = {}
    if (missing.has('gender') && f.gender) payload.gender = f.gender
    if (missing.has('dateOfBirth') && f.dateOfBirth) payload.dateOfBirth = f.dateOfBirth
    if (missing.has('idNumber') && t('idNumber')) payload.idNumber = t('idNumber')
    if (missing.has('phoneNumber') && t('phoneNumber')) payload.phoneNumber = t('phoneNumber')
    if (missing.has('school') && t('school')) payload.school = t('school')
    if (missing.has('address')) {
      const address = {
        unitNumber: t('unitNumber'), complexName: t('complexName'), streetAddress: normaliseStreetAddress(f.streetAddress),
        suburb: t('suburb'), city: t('city'), province: t('province'),
      }
      if (Object.values(address).some(Boolean)) payload.address = address
    }
    return payload
  }

  async function onSubmit(e) {
    e.preventDefault()
    const id = f.idNumber.trim()
    if (f.dateOfBirth && f.dateOfBirth > todayIso()) return setError('The date of birth cannot be in the future.')
    if (id && !isValidSaId(id)) return setError('That is not a valid 13-digit South African ID number.')
    if (id && f.dateOfBirth && !dateOfBirthMatchesId(f.dateOfBirth, id)) return setError('The date of birth does not match the ID number.')
    if (f.streetAddress.trim() && !isValidStreetAddress(f.streetAddress)) return setError(STREET_ADDRESS_MESSAGE)
    const payload = build()
    if (Object.keys(payload).length === 0) return setError('Fill in at least one of the missing details.')
    setError('')
    try {
      await submit.mutateAsync(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save these details')
    }
    return undefined
  }

  return (
    <Sheet title={`Complete ${request.personName}'s details`} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <p className="muted">
          Requested by {request.requestingOrganizationName}{request.note ? `: ${request.note}` : ''}. Only the details that are still
          missing are shown. Once you save, this request is finished and you will no longer see {request.personName}.
        </p>
        {missing.has('gender') && (
          <Field label="Gender">
            <select value={f.gender} onChange={set('gender')}>
              <option value="">—</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g[0] + g.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
        )}
        {(missing.has('idNumber') || missing.has('dateOfBirth')) && (
          <div className="field-row">
            {missing.has('idNumber') && (
              <Field label="South African ID number">
                <input
                  value={f.idNumber}
                  inputMode="numeric"
                  maxLength={13}
                  onChange={(e) => {
                    const idNumber = e.target.value
                    const dob = dateOfBirthFromSaId(idNumber.trim())
                    setF({ ...f, idNumber, dateOfBirth: dob && !f.dateOfBirth && missing.has('dateOfBirth') ? dob : f.dateOfBirth })
                  }}
                />
              </Field>
            )}
            {missing.has('dateOfBirth') && (
              <Field label="Date of birth"><input type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} max={todayIso()} /></Field>
            )}
          </div>
        )}
        {missing.has('phoneNumber') && (
          <Field label="Phone number"><input type="tel" value={f.phoneNumber} onChange={set('phoneNumber')} /></Field>
        )}
        {missing.has('school') && <Field label="School"><input value={f.school} onChange={set('school')} maxLength={255} /></Field>}
        {missing.has('address') && (
          <>
            <h3>Address</h3>
            <div className="field-row" style={{ marginTop: 10 }}>
              <Field label="Unit number"><input value={f.unitNumber} onChange={set('unitNumber')} /></Field>
              <Field label="Complex / building"><input value={f.complexName} onChange={set('complexName')} /></Field>
            </div>
            <Field label="Street address"><input value={f.streetAddress} onChange={set('streetAddress')} maxLength={255} placeholder="12 Mandela Way" /></Field>
            <div className="field-row">
              <Field label="Suburb"><input value={f.suburb} onChange={set('suburb')} /></Field>
              <Field label="City"><input value={f.city} onChange={set('city')} /></Field>
              <Field label="Province"><input value={f.province} onChange={set('province')} /></Field>
            </div>
          </>
        )}
        {error && <p className="message error" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={submit.isPending}>{submit.isPending ? 'Saving…' : 'Save details'}</button>
        </div>
      </form>
    </Sheet>
  )
}
