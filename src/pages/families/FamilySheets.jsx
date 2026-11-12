import { useState } from 'react'
import { changeFamilyMembers, createFamily, referFamily, updateFamily } from '../../lib/api.js'
import { fullName } from '../../lib/format.js'
import { CONSENT_LABELS } from '../../lib/labels.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { familyKeys, useFamily } from '../../hooks/care.js'
import { peopleKey } from '../../hooks/people.js'
import Field from '../../components/Field.jsx'
import MemberPicker from '../../components/MemberPicker.jsx'
import OrgSearch from '../../components/OrgSearch.jsx'
import Sheet from '../../components/Sheet.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

const withoutFamily = (people) => people.filter((p) => !p.familyId)
const refreshFamilies = (orgId) => [familyKeys.list(orgId), peopleKey(orgId)]

export function NewFamilySheet({ orgId, people, onClose }) {
  const [name, setName] = useState('')
  const [needs, setNeeds] = useState('')
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')

  const create = useApiMutation((payload) => createFamily(orgId, payload), {
    invalidate: refreshFamilies(orgId), success: 'Family created.', onSuccess: onClose, quiet: true,
  })

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Enter the family surname.')
    setError('')
    try {
      await create.mutateAsync({ name: name.trim(), needs: needs.trim() || null, personIds: members })
    } catch (err) {
      setError(err.message || 'Could not create the family')
    }
    return undefined
  }

  return (
    <Sheet title="New family" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Family surname"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} placeholder="Dlamini" autoFocus /></Field>
        <Field label="What the family needs (optional)"><textarea rows={3} value={needs} onChange={(e) => setNeeds(e.target.value)} maxLength={4000} /></Field>
        <h3>Members (optional)</h3>
        <div className="mt">
          <MemberPicker candidates={withoutFamily(people)} selected={members} onChange={setMembers} emptyText="Everyone is already in a family." />
        </div>
        {error && <p className="message error mt" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create family'}</button>
        </div>
      </form>
    </Sheet>
  )
}

export function EditFamilySheet({ orgId, family, people, onClose }) {
  const current = family.members || []
  const [name, setName] = useState(family.name)
  const [needs, setNeeds] = useState(family.needs || '')
  const [removing, setRemoving] = useState([]) // removals are only staged here and applied on Save
  const [adding, setAdding] = useState([])
  const [error, setError] = useState('')

  const save = useApiMutation(
    async () => {
      await updateFamily(family.familyId, { name, needs })
      if (adding.length || removing.length) await changeFamilyMembers(family.familyId, { add: adding, remove: removing })
    },
    { invalidate: [...refreshFamilies(orgId), familyKeys.one(family.familyId)], success: 'Family saved.', onSuccess: onClose, quiet: true },
  )

  const toggle = (id) => setRemoving(removing.includes(id) ? removing.filter((x) => x !== id) : [...removing, id])

  return (
    <Sheet title="Edit family" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          try { await save.mutateAsync() } catch (err) { setError(err.message || 'Could not save the family') }
        }}
      >
        <Field label="Family surname"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} /></Field>
        <Field label="What the family needs"><textarea rows={4} value={needs} onChange={(e) => setNeeds(e.target.value)} maxLength={4000} /></Field>
        <h3>Members</h3>
        <ul className="mt">
          {current.map((m) => {
            const out = removing.includes(m.personId)
            return (
              <li className="list-row" key={m.personId}>
                <span className={`grow${out ? ' muted' : ''}`} style={out ? { textDecoration: 'line-through' } : undefined}>{fullName(m)}</span>
                <button type="button" className={`link-btn${out ? '' : ' danger'}`} onClick={() => toggle(m.personId)}>{out ? 'Undo' : 'Remove'}</button>
              </li>
            )
          })}
          {current.length === 0 && <li className="muted">No members yet.</li>}
        </ul>
        <h4 className="mt">Add members</h4>
        <div className="mt">
          <MemberPicker candidates={withoutFamily(people)} selected={adding} onChange={setAdding} emptyText="Everyone is already in a family." />
        </div>
        {error && <p className="message error mt" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Sheet>
  )
}

export function ReferSheet({ orgId, family, onClose }) {
  const [chosen, setChosen] = useState(null)
  const [reason, setReason] = useState('')

  const send = useApiMutation(() => referFamily(family.familyId, { toOrganizationId: chosen.organizationId, reason: reason.trim() || null }), {
    invalidate: [familyKeys.list(orgId)], success: 'Referral sent.', onSuccess: onClose,
  })

  return (
    <Sheet title={`Refer ${family.name}`} onClose={onClose}>
      <p className="muted">
        The other organisation first sees the family&apos;s name and needs. It only sees members after it accepts, and only members who have a valid
        consent that allows sharing with partners.
      </p>
      <div className="mt">
        <OrgSearch excludeOrgId={orgId} label="Find an organisation" actionLabel="Choose" onChoose={setChosen} />
        <p className="muted">{chosen ? `Referring to: ${chosen.name}` : 'No organisation chosen yet.'}</p>
      </div>
      <div className="mt">
        <Field label="Why, and what help is needed (optional)">
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
        </Field>
      </div>
      <div className="sheet-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn" disabled={!chosen || send.isPending} onClick={() => send.mutate()}>
          {send.isPending ? 'Sending…' : 'Send referral'}
        </button>
      </div>
    </Sheet>
  )
}

/** A family another organisation referred to us (after we accepted): only members we may see. */
export function ReferredFamilySheet({ familyId, onClose }) {
  const family = useFamily(familyId)
  const f = family.data
  return (
    <Sheet title="Referred family" onClose={onClose}>
      {family.isPending && <Skeleton height={120} />}
      {family.isError && <p className="message error">{family.error.message || 'Could not load the family'}</p>}
      {f && (
        <>
          <h3>{f.name} <span className="muted small">from {f.organizationName}</span></h3>
          <p className="mt">{f.needs ? <><strong>Needs:</strong> {f.needs}</> : <span className="muted">No needs recorded.</span>}</p>
          <h4 className="mt">Members you can see</h4>
          <ul className="mt">
            {(f.members || []).map((m) => (
              <li className="list-row" key={m.personId}>
                <div className="grow">
                  {fullName(m)}
                  <div className="meta">{m.ageGroup === 'CHILD' ? 'child' : m.ageGroup === 'ADULT' ? 'adult' : ''}{m.school ? `, ${m.school}` : ''}{m.consentStatus ? ` · ${CONSENT_LABELS[m.consentStatus] || ''}` : ''}</div>
                </div>
              </li>
            ))}
            {(f.members || []).length === 0 && <li className="muted">None.</li>}
          </ul>
          {f.hiddenMemberCount > 0 && (
            <p className="muted small mt">
              {f.hiddenMemberCount} of {f.memberCount} members are not shown: they have no valid consent, or did not agree to be shared with partner organisations.
            </p>
          )}
        </>
      )}
    </Sheet>
  )
}
