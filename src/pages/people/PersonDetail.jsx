import { AGE_LABELS, CONSENT_LABELS, RELATIONSHIP_LABELS } from '../../lib/labels.js'
import { formatDay, fullName, initials } from '../../lib/format.js'
import Icon from '../../components/Icon.jsx'
import CareItemRow from '../care/CareItemRow.jsx'
import { OPEN_STATUSES } from '../care/careHelpers.js'
import { carePlanKey, useCarePlan } from '../../hooks/care.js'
import { useReceived } from '../../hooks/projects.js'
import { usePersonProfileRequests } from '../../hooks/people.js'
import { cancelProfileRequest } from '../../lib/api.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { canCaptureForChild, consentTone } from './personHelpers.js'

const FIELD_LABELS = {
  gender: 'gender', dateOfBirth: 'date of birth', idNumber: 'ID number', phoneNumber: 'phone', address: 'address', school: 'school',
}

/** The services this person gets and when they last checked in. Their own items, plus the family's when they are in one. */
function CareSummary({ person: p }) {
  const own = useCarePlan('person', p.personId)
  const fam = useCarePlan('family', p.familyId, !!p.familyId)
  const items = [
    ...(own.data || []).map((i) => ({ i, key: carePlanKey('person', p.personId) })),
    ...(fam.data || []).map((i) => ({ i, key: carePlanKey('family', p.familyId) })),
  ].filter(({ i }) => OPEN_STATUSES.includes(i.status))
  if (own.isPending || own.isError || !items.length) return null
  return (
    <div className="mt">
      <h3>Care and check-ins</h3>
      <ul className="mt">
        {items.map(({ i, key }) => <CareItemRow key={i.itemId} item={i} invalidate={[key]} />)}
      </ul>
    </div>
  )
}

/** Shown while a partner has been asked to complete this profile, with a way to take the request back. */
function AwaitingPartner({ person: p }) {
  const requests = usePersonProfileRequests(p.personId)
  const cancel = useApiMutation((id) => cancelProfileRequest(id), {
    invalidate: [['profile-requests', p.personId], ['profile-requests-org']], success: 'Request cancelled.',
  })
  const open = (requests.data || []).filter((r) => r.status === 'OPEN')
  if (!open.length) return null
  return (
    <div className="mt">
      {open.map((r) => (
        <p key={r.requestId} className="message">
          {r.assigneeOrganizationName} has been asked to complete this profile.{' '}
          {r.canCancel && <button type="button" className="link-btn danger" onClick={() => cancel.mutate(r.requestId)}>Cancel request</button>}
        </p>
      ))}
    </div>
  )
}

/** What this person has been given through projects (separate from the care plan, which is the schedule of regular care). */
function ReceivedSummary({ person: p }) {
  const received = useReceived(p.personId)
  if (received.isPending || received.isError || !received.data.length) return null
  return (
    <div className="mt">
      <h3>Received</h3>
      <ul className="mt">
        {received.data.map((h) => (
          <li key={h.handoutId} className="list-row">
            <div className="grow">
              <strong>{h.stockItemName || h.description}{h.quantity > 1 ? ` × ${h.quantity}` : ''}</strong>
              <div className="meta">{formatDay(h.handedOn)} · {h.projectName} · {h.organizationName}{h.givenByName ? ` (${h.givenByName})` : ''}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One person's record with everything staff can do with it. */
export default function PersonDetail({ person: p, people, onEdit, onCarePlan, onHistory, onAskPartner, onCapture, onCaptureChild, onWithdraw, onViewCopy }) {
  const parent = p.primaryPersonId ? people.find((x) => x.personId === p.primaryPersonId) : null
  const missing = (p.missingFields || []).map((f) => FIELD_LABELS[f] || f)
  const valid = p.consentStatus === 'VALID'
  const isChild = p.ageGroup === 'CHILD'

  return (
    <section className="card">
      <div className="person-hero">
        <div className="avatar avatar-lg">{initials(fullName(p))}</div>
        <h2 className="mt">{fullName(p)}</h2>
        <p className="muted">
          {AGE_LABELS[p.ageGroup] || p.ageGroup}
          {p.school ? ` · ${p.school}` : ''}
        </p>
        <div className="badges mt" style={{ justifyContent: 'center' }}>
          <span className={`badge ${consentTone(p.consentStatus)}`}>{CONSENT_LABELS[p.consentStatus] || p.consentStatus}</span>
          {valid && <span className="badge">{p.sharesWithPartners ? 'Shared with partners' : 'Not shared with partners'}</span>}
        </div>
      </div>

      <div className="mt">
        {p.relationship && (
          <div className="kv">
            <span>Registered under</span>
            <span>{RELATIONSHIP_LABELS[p.relationship] || p.relationship} of {parent ? fullName(parent) : '—'}</span>
          </div>
        )}
        <div className="kv">
          <span>Not on file yet</span>
          <span>{missing.length ? missing.join(', ') : 'Complete'}</span>
        </div>
      </div>

      <AwaitingPartner key={`awaiting-${p.personId}`} person={p} />
      <CareSummary key={p.personId} person={p} />
      <ReceivedSummary key={`received-${p.personId}`} person={p} />

      <div className="action-grid mt">
        <button type="button" className="action-tile" onClick={() => onEdit(p)}><Icon name="edit" />Edit details</button>
        <button type="button" className="action-tile" onClick={() => onCarePlan(p)}><Icon name="heart" />Care plan</button>
        <button type="button" className="action-tile" onClick={() => onHistory(p)}><Icon name="history" />History</button>
        {missing.length > 0 && (
          <button type="button" className="action-tile" onClick={() => onAskPartner(p)}><Icon name="partners" />Ask a partner to complete</button>
        )}
        {valid && <button type="button" className="action-tile" onClick={() => onViewCopy(p)}><Icon name="doc" />View signed copy</button>}
        {isChild
          ? !valid && canCaptureForChild(p, people) && (
              <button type="button" className="action-tile" onClick={() => onCaptureChild(p)}><Icon name="sign" />Capture consent</button>
            )
          : (
              <button type="button" className="action-tile" onClick={() => onCapture(p)}>
                <Icon name="sign" />{valid ? 'Add children' : 'Capture consent'}
              </button>
            )}
        {valid && <button type="button" className="action-tile danger" onClick={() => onWithdraw(p)}><Icon name="x" />Withdraw consent</button>}
      </div>
      {isChild && !valid && !canCaptureForChild(p, people) && (
        <p className="muted small mt">Add them to a family with a parent or guardian (Families tab) to capture consent.</p>
      )}
    </section>
  )
}
