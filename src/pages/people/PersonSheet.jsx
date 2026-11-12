import { useState } from 'react'
import { createPerson, updatePerson } from '../../lib/api.js'
import { fullName, todayIso } from '../../lib/format.js'
import { RELATIONSHIP_OPTIONS } from '../../lib/labels.js'
import {
  STREET_ADDRESS_MESSAGE, dateOfBirthFromSaId, dateOfBirthMatchesId, isValidSaId, isValidStreetAddress, normaliseStreetAddress,
} from '../../lib/validation.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { peopleKey, usePerson } from '../../hooks/people.js'
import Field from '../../components/Field.jsx'
import Sheet from '../../components/Sheet.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

const GENDERS = ['MALE', 'FEMALE', 'OTHER']

/** Single search-and-pick for the adult this person is registered under. */
function PrimaryPicker({ adults, value, onChange }) {
  const [query, setQuery] = useState('')
  const chosen = adults.find((p) => p.personId === value)
  const q = query.trim().toLowerCase()
  const matches = !chosen && q ? adults.filter((p) => fullName(p).toLowerCase().includes(q)).slice(0, 8) : []

  return (
    <div className="field">
      <label htmlFor="pf-primary-search">Adult</label>
      {chosen && (
        <div>
          <span className="mp-chip">
            {fullName(chosen)}
            <button type="button" aria-label={`Remove ${fullName(chosen)}`} onClick={() => onChange('')}>×</button>
          </span>
        </div>
      )}
      {!chosen && (
        <input id="pf-primary-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search adults by name…" autoComplete="off" />
      )}
      {!chosen && q && (
        <ul className="search-results">
          {matches.map((p) => (
            <li key={p.personId}>
              <span>{fullName(p)}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onChange(p.personId); setQuery('') }}>Choose</button>
            </li>
          ))}
          {matches.length === 0 && <li className="muted">No adult found.</li>}
        </ul>
      )}
    </div>
  )
}

function PersonForm({ orgId, existing, people, onDone, onClose }) {
  const editing = !!existing
  const v = existing || {}
  const a = v.address || {}
  const personId = existing?.personId
  const adults = people.filter((p) => p.ageGroup !== 'CHILD' && p.personId !== personId)

  const [f, setF] = useState({
    category: !existing ? 'ADULT' : v.ageGroup === 'CHILD' ? 'CHILD' : v.ageGroup === 'ADULT' ? 'ADULT' : 'UNKNOWN',
    name: v.name || '', surname: v.surname || '', gender: v.gender || '', school: v.school || '',
    idNumber: v.idNumber || '', dateOfBirth: v.dateOfBirth || '', phoneNumber: v.phoneNumber || '', email: v.email || '',
    unitNumber: a.unitNumber || '', complexName: a.complexName || '', streetAddress: a.streetAddress || '',
    suburb: a.suburb || '', city: a.city || '', province: a.province || '',
    primaryPersonId: v.primaryPersonId && adults.some((p) => p.personId === v.primaryPersonId) ? v.primaryPersonId : '',
    relationship: v.relationship || '',
    consentWhen: 'later',
  })
  const [error, setError] = useState('')
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value })

  const save = useApiMutation(
    (payload) => (editing ? updatePerson(personId, payload) : createPerson(orgId, payload)),
    { invalidate: [peopleKey(orgId), ['families', orgId]], quiet: true },
  )

  function validate() {
    if (!f.name.trim() || !f.surname.trim()) return 'Enter the first name and surname.'
    const dob = f.dateOfBirth
    const id = f.idNumber.trim()
    if (dob && dob > todayIso()) return 'The date of birth cannot be in the future.'
    if (id) {
      if (!isValidSaId(id)) return 'That is not a valid 13-digit South African ID number.'
      if (dob && !dateOfBirthMatchesId(dob, id)) return 'The date of birth does not match the ID number.'
    }
    if (f.streetAddress.trim() && !isValidStreetAddress(f.streetAddress)) return STREET_ADDRESS_MESSAGE
    if (f.primaryPersonId && f.primaryPersonId === personId) return 'A person cannot be registered under themselves.'
    return ''
  }

  function buildPayload() {
    const t = (key) => f[key].trim()
    const payload = {
      name: t('name'), surname: t('surname'),
      gender: f.gender || null,
      ageCategory: f.category === 'UNKNOWN' ? null : f.category,
      school: t('school'), idNumber: t('idNumber'),
      dateOfBirth: f.dateOfBirth || null,
      phoneNumber: t('phoneNumber'), email: t('email'),
      primaryPersonId: f.primaryPersonId || null,
      relationship: f.relationship || null,
    }
    const address = {
      unitNumber: t('unitNumber'), complexName: t('complexName'), streetAddress: normaliseStreetAddress(f.streetAddress),
      suburb: t('suburb'), city: t('city'), province: t('province'),
    }
    if (Object.values(address).some(Boolean) || editing) payload.address = address // editing: all blank clears the address
    if (!editing) {
      // a new record only carries what is known
      for (const key of Object.keys(payload)) if (payload[key] === '' || payload[key] === null) delete payload[key]
    }
    return payload
  }

  async function submit(e) {
    e.preventDefault()
    const problem = validate()
    if (problem) return setError(problem)
    setError('')
    try {
      const person = await save.mutateAsync(buildPayload())
      onDone(person, { captureConsent: !editing && f.consentWhen === 'now', editing })
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not save this person')
    }
    return undefined
  }

  return (
    <form onSubmit={submit}>
      <p className="muted">
        Only a name and surname are needed. Add whatever else you know now and fill in the rest later.
        {!editing && ' Consent can be captured now or later; a person needs a valid consent before they can take part in a project or have anything shared.'}
      </p>

      <div className="choice-row mt" role="radiogroup" aria-label="Age group">
        {[['ADULT', 'Adult'], ['CHILD', 'Child (under 18)'], ['UNKNOWN', 'Not sure yet']].map(([value, label]) => (
          <label className="choice" key={value}>
            <input type="radio" name="category" value={value} checked={f.category === value} onChange={set('category')} /> {label}
          </label>
        ))}
      </div>

      <div className="field-row">
        <Field label="First name"><input value={f.name} onChange={set('name')} maxLength={255} autoComplete="off" autoFocus={!editing} /></Field>
        <Field label="Surname"><input value={f.surname} onChange={set('surname')} maxLength={255} autoComplete="off" /></Field>
      </div>
      <div className="field-row">
        <Field label="Gender (optional)">
          <select value={f.gender} onChange={set('gender')}>
            <option value="">—</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g[0] + g.slice(1).toLowerCase()}</option>)}
          </select>
        </Field>
        <Field label="School (optional)"><input value={f.school} onChange={set('school')} maxLength={255} /></Field>
      </div>
      <div className="field-row">
        <Field label="South African ID number (optional)">
          <input
            value={f.idNumber}
            inputMode="numeric"
            maxLength={13}
            onChange={(e) => {
              const idNumber = e.target.value
              const dob = dateOfBirthFromSaId(idNumber.trim())
              setF({ ...f, idNumber, dateOfBirth: dob && !f.dateOfBirth ? dob : f.dateOfBirth })
            }}
          />
        </Field>
        <Field label="Date of birth (optional)">
          <input type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} max={todayIso()} />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Phone number (optional)"><input type="tel" value={f.phoneNumber} onChange={set('phoneNumber')} /></Field>
        <Field label="Email (optional)"><input type="email" value={f.email} onChange={set('email')} /></Field>
      </div>

      <h3>Address (optional)</h3>
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

      <h3>Registered under (optional)</h3>
      <p className="muted small" style={{ margin: '4px 0 10px' }}>Leave empty for a child with no parent on record.</p>
      <div className="field-row">
        <PrimaryPicker adults={adults} value={f.primaryPersonId} onChange={(id) => setF({ ...f, primaryPersonId: id })} />
        <Field label="Relationship to them">
          <select value={f.relationship} onChange={set('relationship')}>
            <option value="">—</option>
            {RELATIONSHIP_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>

      {!editing && (
        <>
          <h3>Consent</h3>
          <div className="choice-row" style={{ marginTop: 10 }}>
            <label className="choice"><input type="radio" name="consent-when" value="later" checked={f.consentWhen === 'later'} onChange={set('consentWhen')} /> Capture consent later</label>
            <label className="choice"><input type="radio" name="consent-when" value="now" checked={f.consentWhen === 'now'} onChange={set('consentWhen')} /> Capture consent now</label>
          </div>
        </>
      )}

      {error && <p className="message error" role="alert">{error}</p>}
      <div className="sheet-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add person'}
        </button>
      </div>
    </form>
  )
}

/**
 * Add a person (personId empty) or fill in more of their details (personId set).
 * onDone(person, { captureConsent, editing }) runs after saving.
 */
export default function PersonSheet({ orgId, personId = null, people, onDone, onClose }) {
  const person = usePerson(personId)

  return (
    <Sheet title={personId ? 'Update person' : 'Add a person'} onClose={onClose}>
      {personId && person.isPending && <Skeleton height={200} />}
      {personId && person.isError && <p className="message error">{person.error.message || 'Could not load this person'}</p>}
      {(!personId || person.isSuccess) && (
        <PersonForm orgId={orgId} existing={person.data} people={people} onDone={onDone} onClose={onClose} />
      )}
    </Sheet>
  )
}
