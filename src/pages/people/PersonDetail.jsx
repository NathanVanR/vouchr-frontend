import { AGE_LABELS, CONSENT_LABELS, RELATIONSHIP_LABELS } from '../../lib/labels.js'
import { fullName, initials } from '../../lib/format.js'
import Icon from '../../components/Icon.jsx'
import { canCaptureForChild, consentTone } from './personHelpers.js'

const FIELD_LABELS = {
  gender: 'gender', dateOfBirth: 'date of birth', idNumber: 'ID number', phoneNumber: 'phone', address: 'address', school: 'school',
}

/** One person's record with everything staff can do with it. */
export default function PersonDetail({ person: p, people, onEdit, onCarePlan, onCapture, onCaptureChild, onWithdraw, onViewCopy }) {
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

      <div className="action-grid mt">
        <button type="button" className="action-tile" onClick={() => onEdit(p)}><Icon name="edit" />Edit details</button>
        <button type="button" className="action-tile" onClick={() => onCarePlan(p)}><Icon name="heart" />Care plan</button>
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
