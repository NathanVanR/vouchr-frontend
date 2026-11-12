import { useState } from 'react'
import { addBeneficiary } from '../../lib/api.js'
import { fullName } from '../../lib/format.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys } from '../../hooks/projects.js'
import { usePeople } from '../../hooks/people.js'
import Field from '../../components/Field.jsx'
import Sheet from '../../components/Sheet.jsx'
import { EXTRA_FIELDS } from './extraFields.js'

function ExtraDetailsSheet({ person, fields, busy, onSubmit, onClose }) {
  const [values, setValues] = useState({})
  return (
    <Sheet title={`Enrol ${fullName(person)}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const attributes = {}
          for (const [key, value] of Object.entries(values)) if (value.trim()) attributes[key] = value.trim()
          onSubmit(attributes)
        }}
      >
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} maxLength={255} placeholder={f.placeholder} />
          </Field>
        ))}
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Enrolling…' : 'Enrol'}</button>
        </div>
      </form>
    </Sheet>
  )
}

/** Enrol a registered person who has a valid consent and is not in the project yet. */
export default function EnrolCard({ project, enrolOrgId, enrolled }) {
  const people = usePeople(enrolOrgId)
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(null)
  const fields = EXTRA_FIELDS[project.projectType] || []

  const already = new Set(enrolled.map((b) => b.personId))
  const candidates = (people.data ?? []).filter((p) => p.consentStatus === 'VALID' && !already.has(p.personId))
  const q = query.trim().toLowerCase()
  const matches = q ? candidates.filter((p) => fullName(p).toLowerCase().includes(q)).slice(0, 8) : []

  const enrol = useApiMutation(({ person, attributes }) => addBeneficiary(project.projectId, { personId: person.personId, attributes }), {
    invalidate: [projectKeys.beneficiaries(project.projectId)],
    success: (_, { person }) => `${fullName(person)} enrolled.`,
    onSuccess: () => { setPending(null); setQuery('') },
  })

  function choose(person) {
    if (fields.length) setPending(person) // types with extra details ask for them first
    else enrol.mutate({ person, attributes: {} })
  }

  return (
    <section className="card">
      <h2>Enrol a person</h2>
      <p className="muted">Only people with a signed consent can be enrolled.</p>
      <div className="field mt">
        <label htmlFor="enrol-search">Find a person</label>
        <input id="enrol-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name…" autoComplete="off" />
        {q && (
          <ul className="search-results">
            {matches.map((p) => (
              <li key={p.personId}>
                <span>{fullName(p)}</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={enrol.isPending} onClick={() => choose(p)}>Enrol</button>
              </li>
            ))}
            {matches.length === 0 && <li className="muted">No one found. Only people with a signed consent can be enrolled.</li>}
          </ul>
        )}
      </div>
      {pending && (
        <ExtraDetailsSheet
          person={pending}
          fields={fields}
          busy={enrol.isPending}
          onSubmit={(attributes) => enrol.mutate({ person: pending, attributes })}
          onClose={() => setPending(null)}
        />
      )}
    </section>
  )
}
