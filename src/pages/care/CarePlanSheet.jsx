// The care plan for a family or for one person: the services someone gets from us or from partner organisations.
// Staff can add any service and either provide it themselves or ask an active partner to (the partner accepts or declines).
// A partner is only told the name(s) of people whose consent allows sharing, and the service asked for; it updates the status as they attend.
//
// A person who belongs to a family sees the family's plan too (read-only here: it is managed on the Families tab and
// applies to everyone in the family), plus their own items, which only apply to them.
import { useState } from 'react'
import { addFamilyCarePlanItem, addPersonCarePlanItem, updateCarePlanStatus } from '../../lib/api.js'
import { SERVICE_LABELS } from '../../lib/labels.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { carePlanKey, useCarePlan, useFamily, usePartnershipList } from '../../hooks/care.js'
import CareItemRow from './CareItemRow.jsx'
import { OPEN_STATUSES } from './careHelpers.js'
import Field from '../../components/Field.jsx'
import Sheet from '../../components/Sheet.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

function AddService({ providers, isFamily, subject, familyItems, onAdded }) {
  const [type, setType] = useState('FOOD')
  const [providerId, setProviderId] = useState(providers[0].orgId)
  const [label, setLabel] = useState('')
  const [schedule, setSchedule] = useState('')
  const chosen = providers.find((o) => o.orgId === providerId) || providers[0]

  // flag what the family already gets, so staff don't add it a second time for one member
  const onFamilyPlan = familyItems.some((i) => OPEN_STATUSES.includes(i.status) && i.serviceType === type && i.providerOrganizationId === chosen.orgId)

  const add = useApiMutation(
    (payload) => (isFamily ? addFamilyCarePlanItem(subject.id, payload) : addPersonCarePlanItem(subject.id, payload)),
    {
      invalidate: [carePlanKey(subject.kind, subject.id)],
      success: chosen.self ? 'Added to the plan.' : `Requested from ${chosen.name}.`,
      onSuccess: () => { setLabel(''); setSchedule(''); onAdded?.() },
    },
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        add.mutate({
          providerOrganizationId: chosen.orgId,
          serviceType: type,
          serviceLabel: type === 'OTHER' ? label.trim() || null : null,
          schedule: schedule.trim() || null,
        })
      }}
    >
      <Field label="What is needed?">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      {type === 'OTHER' && (
        <Field label="What is the service?">
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} placeholder="e.g. Funeral costs" />
        </Field>
      )}
      <Field
        label="Who provides it?"
        hint={chosen.self ? 'No approval needed: it starts straight away.' : 'They will see the request and can accept or decline it.'}
      >
        <select value={chosen.orgId} onChange={(e) => setProviderId(e.target.value)}>
          {providers.map((o) => <option key={o.orgId} value={o.orgId}>{o.self ? 'Us' : o.name}</option>)}
        </select>
      </Field>
      {onFamilyPlan && <p className="muted small">Already on the family plan from this provider.</p>}
      <Field label="When (optional)">
        <input value={schedule} onChange={(e) => setSchedule(e.target.value)} maxLength={500} placeholder="e.g. Tuesdays 18:00" />
      </Field>
      <button type="submit" className="btn" disabled={add.isPending}>
        {add.isPending ? 'Adding…' : chosen.self ? 'Add to plan' : 'Request from partner'}
      </button>
    </form>
  )
}

/**
 * orgId    the organisation whose staff are using the dialog
 * subject  { kind: 'family', id, name } | { kind: 'person', id, name, familyId? }
 */
export default function CarePlanSheet({ orgId, subject, onClose }) {
  const isFamily = subject.kind === 'family'
  const familyId = isFamily ? subject.id : subject.familyId || null
  const withFamily = !isFamily && !!familyId

  const own = useCarePlan(subject.kind, subject.id)
  const familyPlan = useCarePlan('family', familyId, withFamily)
  const family = useFamily(familyId, withFamily)
  const partnerships = usePartnershipList(orgId)

  const remove = useApiMutation((itemId) => updateCarePlanStatus(itemId, 'CLOSED', null), {
    invalidate: [carePlanKey(subject.kind, subject.id)],
    success: 'Removed.',
  })

  const queries = [own, partnerships, ...(withFamily ? [familyPlan, family] : [])]
  const loading = queries.some((q) => q.isPending)
  const failed = queries.find((q) => q.isError)

  // us, plus every active partner: what each provides is agreed in real life, not declared here
  const providers = [{ orgId, name: 'Us', self: true }]
  ;(partnerships.data || []).filter((p) => p.status === 'ACTIVE').forEach((p) => {
    const weAreRequester = p.requesterOrganizationId === orgId
    providers.push({
      orgId: weAreRequester ? p.partnerOrganizationId : p.requesterOrganizationId,
      name: weAreRequester ? p.partnerOrganizationName : p.requesterOrganizationName,
      self: false,
    })
  })

  return (
    <Sheet title={`Care plan for ${subject.name}`} onClose={onClose}>
      {loading && <Skeleton height={160} />}
      {failed && <p className="message error">{failed.error.message || 'Could not load the care plan'}</p>}
      {!loading && !failed && (
        <div className="stack-lg">
          <p className="muted">
            {isFamily
              ? 'Services this family gets from us or from partner organisations.'
              : 'Services this person gets from us or from partner organisations. A partner can only be given someone whose consent allows sharing with partners.'}{' '}
            Some projects only accept people who are attending a service.
          </p>

          {withFamily && (
            <section>
              <h3>Family care plan{family.data ? ` — ${family.data.name}` : ''}</h3>
              <p className="muted small">Applies to everyone in the family. Change it on the Families tab.</p>
              <ul className="mt">
                {familyPlan.data.map((i) => <CareItemRow key={i.itemId} item={i} />)}
                {familyPlan.data.length === 0 && <li className="muted">Nothing on the family plan yet.</li>}
              </ul>
            </section>
          )}

          <section>
            <h3>{isFamily ? 'Care plan' : `${subject.name}'s own care plan`}</h3>
            <ul className="mt">
              {own.data.map((i) => <CareItemRow key={i.itemId} item={i} invalidate={[carePlanKey(subject.kind, subject.id)]} onRemove={(id) => remove.mutate(id)} />)}
              {own.data.length === 0 && <li className="muted">Nothing on the plan yet.</li>}
            </ul>
          </section>

          <section>
            <h3>Add a service</h3>
            <div className="mt">
              <AddService providers={providers} isFamily={isFamily} subject={subject} familyItems={withFamily ? familyPlan.data : []} />
            </div>
          </section>
        </div>
      )}
    </Sheet>
  )
}
