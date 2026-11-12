// Partnerships between organisations, the services each offers, and the care-plan items partners have asked this
// organisation to provide. Admins agree partnerships here after agreeing them in real life; staff can only work with
// partners that exist. A partner only ever sees a person's name and the requested service, never anything about their other help.
import { useState } from 'react'
import {
  answerPartnership, checkInCarePlanItem, proposePartnership, setOrgServices, updateCarePlanStatus,
} from '../../lib/api.js'
import { CARE_STATUS_LABELS, SERVICE_LABELS, serviceName } from '../../lib/labels.js'
import { formatDateTime } from '../../lib/format.js'
import { useAuth } from '../../auth/useAuth.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import { partnershipsKey, useCareItems, useOrgServices, usePartnershipList } from '../../hooks/care.js'
import { projectKeys } from '../../hooks/projects.js'
import { useDialogs } from '../../dialogs/useDialogs.js'
import PageHero from '../../components/PageHero.jsx'
import Empty from '../../components/Empty.jsx'
import OrgSearch from '../../components/OrgSearch.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'

const PARTNERSHIP_BADGES = {
  PENDING: ['info', 'Waiting for a reply'],
  ACTIVE: ['ok', 'Active'],
  DECLINED: ['bad', 'Declined'],
  ENDED: ['bad', 'Ended'],
}

// What the providing organisation may do next, by current status: [target status, button label]
const NEXT_STEPS = {
  PENDING: [['ATTENDING', 'Accept'], ['DECLINED', 'Decline']],
  ATTENDING: [['LAPSED', 'Lapsed']],
  LAPSED: [['ATTENDING', 'Attending again']],
}

const serviceList = (types) => (types || []).map((t) => SERVICE_LABELS[t] || t).join(', ') || 'none listed'

function PartnershipRow({ p, orgId, isAdmin, onAnswer }) {
  const weAreRequester = p.requesterOrganizationId === orgId
  const otherName = weAreRequester ? p.partnerOrganizationName : p.requesterOrganizationName
  const otherServices = weAreRequester ? p.partnerServices : p.requesterServices
  const [tone, label] = PARTNERSHIP_BADGES[p.status] || ['', p.status]
  const note = p.status === 'PENDING' ? (weAreRequester ? 'Waiting for their admin' : 'Asked by their admin') : ''

  return (
    <li className="list-row" style={{ alignItems: 'flex-start' }}>
      <div className="grow">
        <strong>{otherName}</strong>
        <div className="meta">Offers: {serviceList(otherServices)}</div>
        <div className="mt" style={{ marginTop: 6 }}>
          <span className={`badge ${tone}`}>{label}</span> {note && <span className="muted small">{note}</span>}
        </div>
      </div>
      {isAdmin && (
        <div className="actions">
          {p.status === 'PENDING' && !weAreRequester && (
            <>
              <button type="button" className="btn btn-sm" onClick={() => onAnswer(p, 'accept')}>Accept</button>
              <button type="button" className="link-btn danger" onClick={() => onAnswer(p, 'decline')}>Decline</button>
            </>
          )}
          {p.status === 'PENDING' && weAreRequester && (
            <button type="button" className="link-btn danger" onClick={() => onAnswer(p, 'end')}>Withdraw</button>
          )}
          {p.status === 'ACTIVE' && (
            <button type="button" className="link-btn danger" onClick={() => onAnswer(p, 'end')}>End partnership</button>
          )}
        </div>
      )}
    </li>
  )
}

function ServicesCard({ orgId, isAdmin }) {
  const services = useOrgServices(orgId)
  const [picked, setPicked] = useState(null) // null = what the server says
  const current = picked ?? services.data ?? []
  const save = useApiMutation((list) => setOrgServices(orgId, list), {
    invalidate: [['org-services', orgId], partnershipsKey(orgId)],
    success: 'Services saved.',
    onSuccess: () => setPicked(null),
  })
  const toggle = (type) => setPicked(current.includes(type) ? current.filter((t) => t !== type) : [...current, type])

  return (
    <section className="card">
      <h2>What we offer</h2>
      <p className="muted">The kinds of help this organisation gives. Partners can only ask us for services listed here.</p>
      <div className="mt">
        {services.isPending && <CardSkeletons count={1} height={120} />}
        {services.isError && <p className="message error">{services.error.message}</p>}
        {services.isSuccess && (
          <>
            <div className="check-grid">
              {Object.entries(SERVICE_LABELS).map(([type, label]) => (
                <label className="check-row" key={type}>
                  <input type="checkbox" checked={current.includes(type)} disabled={!isAdmin} onChange={() => toggle(type)} /> {label}
                </label>
              ))}
            </div>
            {isAdmin && (
              <button type="button" className="btn mt" disabled={save.isPending || picked === null} onClick={() => save.mutate(current)}>
                {save.isPending ? 'Saving…' : 'Save services'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}

const checkInText = (item) =>
  item.lastCheckedInAt
    ? `Last check-in: ${formatDateTime(item.lastCheckedInAt)}${item.lastCheckedInByName ? ` (${item.lastCheckedInByName})` : ''}`
    : 'Not checked in yet'

function IncomingCard({ item, onStatus, onCheckIn, busy }) {
  const who = item.familyId ? `${item.familyName} family` : item.personName || 'A person (no longer shared)'
  const steps = item.canUpdateStatus ? NEXT_STEPS[item.status] || [] : []
  // COMPLETED can no longer be set, but items that already are can still be removed
  const closable = item.canUpdateStatus && ['PENDING', 'ATTENDING', 'LAPSED', 'COMPLETED'].includes(item.status)

  return (
    <article className="card" style={{ boxShadow: 'none', border: '1.5px solid var(--line)' }}>
      <h3>{who}</h3>
      {item.familyId && item.memberNames?.length > 0 && <p className="muted small">{item.memberNames.join(', ')}</p>}
      <p className="muted small">from {item.requestingOrganizationName}</p>
      <p className="mt">
        <strong>{serviceName(item.serviceType, item.serviceLabel)}</strong>
        {item.schedule ? ` · ${item.schedule}` : ''} — {CARE_STATUS_LABELS[item.status] || item.status}
      </p>
      <p className="muted small">{checkInText(item)}</p>
      <div className="actions mt">
        {item.canUpdateStatus && item.status === 'ATTENDING' && (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => onCheckIn(item)}>Check in</button>
        )}
        {steps.map(([status, label]) => (
          <button key={status} type="button" className={`link-btn${status === 'DECLINED' || status === 'LAPSED' ? ' danger' : ''}`} disabled={busy} onClick={() => onStatus(item, status)}>
            {label}
          </button>
        ))}
        {closable && <button type="button" className="link-btn danger" disabled={busy} onClick={() => onStatus(item, 'CLOSED')}>Remove</button>}
      </div>
    </article>
  )
}

/** Nothing is loaded until the counsellor searches: a busy provider can have thousands of people asked of it. */
function AskedOfUs({ orgId }) {
  const { confirm } = useDialogs()
  const [query, setQuery] = useState('')
  const q = useDebounced(query.trim(), 300)
  const items = useCareItems(orgId, 'incoming', q, q.length >= 2)
  const refresh = [['care-plan-items', orgId]]

  const setStatus = useApiMutation(({ item, status }) => updateCarePlanStatus(item.itemId, status, null), { invalidate: refresh, success: 'Updated.' })
  const checkIn = useApiMutation((item) => checkInCarePlanItem(item.itemId), { invalidate: refresh, success: 'Checked in.' })

  async function onStatus(item, status) {
    if (status === 'CLOSED') {
      const ok = await confirm({
        title: 'Remove this item?', message: 'It stops counting towards any prerequisite.', confirmLabel: 'Remove', danger: true,
      })
      if (!ok) return
    }
    setStatus.mutate({ item, status })
  }

  return (
    <section className="card">
      <h2>Asked of us</h2>
      <p className="muted">
        Search for someone who has come to us by name or surname. Check them in when they attend and keep their status up to date: the
        status and last check-in are all the other organisation sees, and they can decide whether that organisation is allowed to give aid.
      </p>
      <div className="field mt">
        <label htmlFor="care-search">Search by name or surname</label>
        <input id="care-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing a name…" autoComplete="off" />
      </div>
      {q.length < 2 && <p className="muted">Type at least 2 letters to find someone.</p>}
      {q.length >= 2 && items.isPending && <CardSkeletons count={1} height={110} />}
      {items.isError && <p className="message error">{items.error.message || 'Search failed.'}</p>}
      {items.isSuccess && items.data.length === 0 && (
        <p className="muted">Nobody found. They may not have been asked of us yet, or may not have agreed to share their details.</p>
      )}
      <div className="stack">
        {q.length >= 2 && (items.data ?? []).map((item) => (
          <IncomingCard key={item.itemId} item={item} busy={setStatus.isPending || checkIn.isPending} onStatus={onStatus} onCheckIn={(i) => checkIn.mutate(i)} />
        ))}
      </div>
    </section>
  )
}

export default function Partners() {
  const { activeOrgId, activeOrg, isAdmin } = useAuth()
  const { confirm } = useDialogs()
  const partnerships = usePartnershipList(activeOrgId)
  const services = useOrgServices(activeOrgId)

  const refresh = [partnershipsKey(activeOrgId), projectKeys.list(activeOrgId)]
  const propose = useApiMutation((org) => proposePartnership(activeOrgId, org.organizationId), {
    invalidate: refresh, success: 'Request sent. Their admin needs to accept it.',
  })
  const answer = useApiMutation(({ p, action }) => answerPartnership(p.partnershipId, action), {
    invalidate: [...refresh, ['care-plan-items', activeOrgId]],
    success: (_, { action }) => ({ accept: 'Partnership active.', decline: 'Request declined.', end: 'Partnership ended.' })[action],
  })

  async function onAnswer(p, action) {
    if (action === 'end') {
      const ok = await confirm({
        title: p.status === 'PENDING' ? 'Withdraw this request?' : 'End this partnership?',
        message: 'Open items handed over through it close and the other organisation loses access straight away.',
        confirmLabel: p.status === 'PENDING' ? 'Withdraw' : 'End partnership', danger: true,
      })
      if (!ok) return
    }
    answer.mutate({ p, action })
  }

  const visible = (partnerships.data ?? []).filter((p) => p.status === 'PENDING' || p.status === 'ACTIVE')

  return (
    <>
      <PageHero
        eyebrow={activeOrg?.name}
        title="Partners"
        stats={[
          { value: partnerships.data ? visible.filter((p) => p.status === 'ACTIVE').length : '–', label: 'Active partners' },
          { value: partnerships.data ? visible.filter((p) => p.status === 'PENDING').length : '–', label: 'Pending' },
          { value: services.data ? services.data.length : '–', label: 'Services we offer' },
        ]}
      />
      <div className="page-body">
        <section className="card">
          <h2>Partner organisations</h2>
          <p className="muted">
            Organisations that have agreed to work with us, for example a church that offers counselling alongside our food parcels. Only
            organisation admins set these up, after both organisations have agreed in real life. Staff can add a partner&apos;s services to a
            family&apos;s care plan, but only for partners listed here.
          </p>
          <div className="mt">
            {partnerships.isPending && <CardSkeletons count={2} height={70} />}
            {partnerships.isError && <p className="message error">{partnerships.error.message || 'Failed to load partners.'}</p>}
            {partnerships.isSuccess && visible.length === 0 && (
              <Empty title="No partners yet">An admin can propose one below once both organisations have agreed to work together.</Empty>
            )}
            <ul>
              {visible.map((p) => <PartnershipRow key={p.partnershipId} p={p} orgId={activeOrgId} isAdmin={isAdmin} onAnswer={onAnswer} />)}
            </ul>
          </div>
        </section>

        {isAdmin && (
          <section className="card">
            <h2>Propose a partnership</h2>
            <p className="muted">Search for the other organisation. Their admin has to accept before anything is shared.</p>
            <div className="mt">
              <OrgSearch excludeOrgId={activeOrgId} actionLabel="Propose partnership" onChoose={(org) => propose.mutate(org)} disabled={propose.isPending} />
            </div>
          </section>
        )}

        <ServicesCard orgId={activeOrgId} isAdmin={isAdmin} />
        <AskedOfUs orgId={activeOrgId} />
      </div>
    </>
  )
}
