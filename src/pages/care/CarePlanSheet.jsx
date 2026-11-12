// The care plan for a family or for one person: the services someone gets from us or from partner organisations.
// Staff can only pick partners that admins have set up, and only services those partners say they offer. A partner is
// only told the name(s) of people whose consent allows sharing, and the service asked for; it updates the status as they attend.
//
// A person who belongs to a family sees the family's plan too (read-only here: it is managed on the Families tab and
// applies to everyone in the family), plus their own items, which only apply to them.
import { useState } from 'react'
import { addFamilyCarePlanItem, addPersonCarePlanItem, updateCarePlanStatus } from '../../lib/api.js'
import { CARE_STATUS_LABELS, SERVICE_LABELS, serviceName } from '../../lib/labels.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { carePlanKey, useCarePlan, useFamily, useOrgServices, usePartnershipList } from '../../hooks/care.js'
import Field from '../../components/Field.jsx'
import Sheet from '../../components/Sheet.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

const OPEN_STATUSES = ['PENDING', 'ATTENDING', 'LAPSED']

const checkInLabel = (i) => (i.lastCheckedInAt ? `last check-in ${new Date(i.lastCheckedInAt).toLocaleDateString()}` : 'not checked in yet')

function ItemRow({ item: i, onRemove }) {
  return (
    <li className="list-row">
      <div className="grow">
        <strong>{serviceName(i.serviceType, i.serviceLabel)}</strong> — {i.internal ? 'us' : i.providerOrganizationName}
        <div className="meta">
          {CARE_STATUS_LABELS[i.status] || i.status}
          {i.schedule ? ` · ${i.schedule}` : ''} · {checkInLabel(i)}
        </div>
      </div>
      {onRemove && (OPEN_STATUSES.includes(i.status) || i.status === 'COMPLETED') && (
        <button type="button" className="link-btn danger" onClick={() => onRemove(i.itemId)}>Remove</button>
      )}
    </li>
  )
}

function AddService({ options, isFamily, subject, familyItems, onAdded }) {
  const [index, setIndex] = useState(0)
  const [label, setLabel] = useState('')
  const [schedule, setSchedule] = useState('')
  const chosen = options[index]

  // flag what the family already gets, so staff don't add it a second time for one member
  const onFamilyPlan = (o) => familyItems.some((i) => OPEN_STATUSES.includes(i.status) && i.serviceType === o.type && i.providerOrganizationId === o.orgId)

  const add = useApiMutation(
    (payload) => (isFamily ? addFamilyCarePlanItem(subject.id, payload) : addPersonCarePlanItem(subject.id, payload)),
    { invalidate: [carePlanKey(subject.kind, subject.id)], success: 'Added to the plan.', onSuccess: () => { setLabel(''); setSchedule(''); onAdded?.() } },
  )

  if (!options.length) {
    return <p className="muted">No services are available yet. An admin can set what we offer and add partners on the Partners tab.</p>
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        add.mutate({
          providerOrganizationId: chosen.orgId,
          serviceType: chosen.type,
          serviceLabel: chosen.type === 'OTHER' ? label.trim() || null : null,
          schedule: schedule.trim() || null,
        })
      }}
    >
      <Field label="Service and provider">
        <select value={index} onChange={(e) => setIndex(Number(e.target.value))}>
          {options.map((o, n) => (
            <option key={`${o.orgId}-${o.type}`} value={n}>{o.label}{onFamilyPlan(o) ? ' (already on the family plan)' : ''}</option>
          ))}
        </select>
      </Field>
      {chosen.type === 'OTHER' && (
        <Field label="What is the service?">
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} placeholder="e.g. Funeral costs" />
        </Field>
      )}
      <Field label="When (optional)">
        <input value={schedule} onChange={(e) => setSchedule(e.target.value)} maxLength={500} placeholder="e.g. Tuesdays 18:00" />
      </Field>
      <button type="submit" className="btn" disabled={add.isPending}>{add.isPending ? 'Adding…' : 'Add to plan'}</button>
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
  const services = useOrgServices(orgId)

  const remove = useApiMutation((itemId) => updateCarePlanStatus(itemId, 'CLOSED', null), {
    invalidate: [carePlanKey(subject.kind, subject.id)],
    success: 'Removed.',
  })

  const queries = [own, partnerships, services, ...(withFamily ? [familyPlan, family] : [])]
  const loading = queries.some((q) => q.isPending)
  const failed = queries.find((q) => q.isError)

  // our own services, plus what each active partner offers
  const options = []
  if (services.data && partnerships.data) {
    services.data.forEach((type) => options.push({ orgId, type, label: `${SERVICE_LABELS[type] || type} — us` }))
    partnerships.data.filter((p) => p.status === 'ACTIVE').forEach((p) => {
      const weAreRequester = p.requesterOrganizationId === orgId
      const partnerId = weAreRequester ? p.partnerOrganizationId : p.requesterOrganizationId
      const partnerName = weAreRequester ? p.partnerOrganizationName : p.requesterOrganizationName
      ;(weAreRequester ? p.partnerServices : p.requesterServices).forEach((type) =>
        options.push({ orgId: partnerId, type, label: `${SERVICE_LABELS[type] || type} — ${partnerName}` }))
    })
  }

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
                {familyPlan.data.map((i) => <ItemRow key={i.itemId} item={i} />)}
                {familyPlan.data.length === 0 && <li className="muted">Nothing on the family plan yet.</li>}
              </ul>
            </section>
          )}

          <section>
            <h3>{isFamily ? 'Care plan' : `${subject.name}'s own care plan`}</h3>
            <ul className="mt">
              {own.data.map((i) => <ItemRow key={i.itemId} item={i} onRemove={(id) => remove.mutate(id)} />)}
              {own.data.length === 0 && <li className="muted">Nothing on the plan yet.</li>}
            </ul>
          </section>

          <section>
            <h3>Add a service</h3>
            <div className="mt">
              <AddService options={options} isFamily={isFamily} subject={subject} familyItems={withFamily ? familyPlan.data : []} />
            </div>
          </section>
        </div>
      )}
    </Sheet>
  )
}
