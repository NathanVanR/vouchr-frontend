import { useState } from 'react'
import { answerReferral, updateFamily } from '../../lib/api.js'
import { CONSENT_LABELS } from '../../lib/labels.js'
import { fullName } from '../../lib/format.js'
import { useAuth } from '../../auth/useAuth.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'
import { familyKeys, useFamilies, useReferrals } from '../../hooks/care.js'
import { peopleKey, usePeople } from '../../hooks/people.js'
import { useDialogs } from '../../dialogs/useDialogs.js'
import PageHero from '../../components/PageHero.jsx'
import Empty from '../../components/Empty.jsx'
import Icon from '../../components/Icon.jsx'
import Sheet from '../../components/Sheet.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'
import CarePlanSheet from '../care/CarePlanSheet.jsx'
import { EditFamilySheet, NewFamilySheet, ReferSheet, ReferredFamilySheet } from './FamilySheets.jsx'

const REFERRAL_BADGES = {
  PENDING: ['info', 'Waiting for a reply'],
  ACCEPTED: ['ok', 'Accepted'],
  DECLINED: ['bad', 'Declined'],
  CLOSED: ['bad', 'Closed'],
}

const StatusBadge = ({ status }) => {
  const [tone, label] = REFERRAL_BADGES[status] || ['', status]
  return <span className={`badge ${tone}`}>{label}</span>
}

function FamilyCard({ family: f, onEdit, onCarePlan, onRefer, onArchive, onRestore, onEndReferral }) {
  const closed = f.status === 'CLOSED'
  return (
    <section className="card">
      <div className="card-head">
        <h2>{f.name} {closed && <span className="badge">Archived</span>}</h2>
      </div>
      <p>{f.needs ? <><strong>Needs:</strong> {f.needs}</> : <span className="muted">No needs recorded yet.</span>}</p>

      <h4 className="mt">Members</h4>
      <ul className="mt">
        {(f.members || []).map((m) => (
          <li className="list-row" key={m.personId}>
            <div className="grow">
              {fullName(m)}
              <div className="meta">
                {m.ageGroup === 'CHILD' ? 'child' : m.ageGroup === 'ADULT' ? 'adult' : 'age unknown'}{m.school ? `, ${m.school}` : ''} · {CONSENT_LABELS[m.consentStatus] || m.consentStatus}
              </div>
            </div>
          </li>
        ))}
        {(f.members || []).length === 0 && <li className="muted">No members yet.</li>}
      </ul>

      {(f.referrals || []).length > 0 && (
        <>
          <h4 className="mt">Referrals</h4>
          <ul className="mt">
            {f.referrals.map((r) => (
              <li className="list-row" key={r.referralId}>
                <div className="grow">
                  Referred to <strong>{r.toOrganizationName}</strong> <StatusBadge status={r.status} />
                  {r.reason && <div className="meta">{r.reason}</div>}
                </div>
                {(r.status === 'PENDING' || r.status === 'ACCEPTED') && (
                  <button type="button" className="link-btn danger" onClick={() => onEndReferral(r.referralId)}>End referral</button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="actions mt">
        <button type="button" className="btn btn-sm" onClick={() => onEdit(f)}>Edit</button>
        {!closed && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCarePlan(f)}>Care plan</button>}
        {!closed && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRefer(f)}>Refer to another organisation</button>}
        {closed
          ? <button type="button" className="link-btn" onClick={() => onRestore(f)}>Restore family</button>
          : <button type="button" className="link-btn danger" onClick={() => onArchive(f)}>Archive family</button>}
      </div>
    </section>
  )
}

function IncomingReferrals({ orgId, onView }) {
  const { confirm } = useDialogs()
  const referrals = useReferrals(orgId, 'incoming')
  const answer = useApiMutation(({ id, action }) => answerReferral(id, action), {
    invalidate: [familyKeys.referrals(orgId, 'incoming'), familyKeys.list(orgId)],
    success: (_, { action }) => ({ accept: 'Referral accepted.', decline: 'Referral declined.', close: 'Referral ended.' })[action],
  })

  async function endReferral(id) {
    const ok = await confirm({
      title: 'End this referral?', message: 'The other organisation loses access to the family straight away.', confirmLabel: 'End referral', danger: true,
    })
    if (ok) answer.mutate({ id, action: 'close' })
  }

  return (
    <section className="card">
      <h2>Referred to us</h2>
      <p className="muted">Families other organisations have asked this organisation to help.</p>
      <div className="mt">
        {referrals.isPending && <CardSkeletons count={1} height={60} />}
        {referrals.isError && <p className="message error">{referrals.error.message}</p>}
        {referrals.isSuccess && referrals.data.length === 0 && <p className="muted">No families have been referred to this organisation.</p>}
        <ul>
          {(referrals.data ?? []).map((r) => (
            <li className="list-row" key={r.referralId} style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <strong>{r.familyName}</strong> <StatusBadge status={r.status} />
                <div className="meta">from {r.fromOrganizationName}</div>
                {r.familyNeeds && <div className="meta">Needs: {r.familyNeeds}</div>}
                {r.reason && <div className="meta">{r.reason}</div>}
                <div className="actions mt" style={{ marginTop: 6 }}>
                  {r.status === 'PENDING' && (
                    <>
                      <button type="button" className="btn btn-sm" disabled={answer.isPending} onClick={() => answer.mutate({ id: r.referralId, action: 'accept' })}>Accept</button>
                      <button type="button" className="link-btn danger" disabled={answer.isPending} onClick={() => answer.mutate({ id: r.referralId, action: 'decline' })}>Decline</button>
                    </>
                  )}
                  {r.status === 'ACCEPTED' && (
                    <>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onView(r.familyId)}>View family</button>
                      <button type="button" className="link-btn danger" onClick={() => endReferral(r.referralId)}>End referral</button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default function Families() {
  const { activeOrgId, activeOrg } = useAuth()
  const { confirm } = useDialogs()
  const wide = useMediaQuery('(min-width: 1000px)')
  const families = useFamilies(activeOrgId)
  const incoming = useReferrals(activeOrgId, 'incoming')
  const people = usePeople(activeOrgId)

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [sheet, setSheet] = useState(null) // { type: 'new' | 'edit' | 'refer' | 'care' | 'referred', family?, familyId? }

  const all = families.data ?? []
  const selected = all.find((f) => f.familyId === selectedId) || null
  const q = query.trim().toLowerCase()
  const matches = (q ? all.filter((f) => f.name.toLowerCase().includes(q)) : all).slice(0, 40)
  const openReferrals = all.reduce((n, f) => n + (f.referrals || []).filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED').length, 0)

  const setStatus = useApiMutation(({ family, status }) => updateFamily(family.familyId, { status }), {
    invalidate: [familyKeys.list(activeOrgId), peopleKey(activeOrgId)],
    success: (_, { status }) => (status === 'CLOSED' ? 'Family archived.' : 'Family restored.'),
  })
  const endReferral = useApiMutation((id) => answerReferral(id, 'close'), {
    invalidate: [familyKeys.list(activeOrgId)], success: 'Referral ended.',
  })

  async function archive(family) {
    const ok = await confirm({
      title: `Archive the ${family.name} family?`,
      message: 'Any open referrals will end and the other organisations lose access. You can restore it later.',
      confirmLabel: 'Archive family', danger: true,
    })
    if (ok) setStatus.mutate({ family, status: 'CLOSED' })
  }

  async function onEndReferral(id) {
    const ok = await confirm({
      title: 'End this referral?', message: 'The other organisation loses access to the family straight away.', confirmLabel: 'End referral', danger: true,
    })
    if (ok) endReferral.mutate(id)
  }

  const detail = selected && (
    <FamilyCard
      family={selected}
      onEdit={(f) => setSheet({ type: 'edit', family: f })}
      onCarePlan={(f) => setSheet({ type: 'care', family: f })}
      onRefer={(f) => setSheet({ type: 'refer', family: f })}
      onArchive={archive}
      onRestore={(family) => setStatus.mutate({ family, status: 'ACTIVE' })}
      onEndReferral={onEndReferral}
    />
  )

  return (
    <>
      <PageHero
        eyebrow={activeOrg?.name}
        title="Families"
        stats={[
          { value: families.data ? all.filter((f) => f.status !== 'CLOSED').length : '–', label: 'Families' },
          { value: families.data ? openReferrals : '–', label: 'Referred out' },
          { value: incoming.data ? incoming.data.filter((r) => r.status === 'PENDING').length : '–', label: 'Waiting for us' },
        ]}
        action={{ label: 'New family', onClick: () => setSheet({ type: 'new' }) }}
      />

      <div className="page-body">
        <p className="muted" style={{ maxWidth: '70ch' }}>
          Group people who belong together as you learn more about them, record what the family needs, and refer the family to another
          organisation that can help, such as a local social welfare organisation.
        </p>
        <div className="split">
          <section className="card">
            <div className="field" style={{ marginBottom: 6 }}>
              <label htmlFor="family-search">Find a family</label>
              <input id="family-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by family surname…" autoComplete="off" />
            </div>
            {families.isPending && <CardSkeletons count={3} height={52} />}
            {families.isError && <p className="message error">{families.error.message || 'Failed to load families.'}</p>}
            {families.isSuccess && all.length === 0 && <Empty title="No families yet">Tap the yellow button to group people into a family.</Empty>}
            <ul>
              {matches.map((f) => (
                <li key={f.familyId}>
                  <button type="button" className={`row-button${f.familyId === selectedId && wide ? ' is-selected' : ''}`} onClick={() => setSelectedId(f.familyId)}>
                    <div className="avatar"><Icon name="family" /></div>
                    <div className="grow">
                      <strong>{f.name}</strong>
                      <div className="meta">{(f.members || []).length} {(f.members || []).length === 1 ? 'member' : 'members'}</div>
                    </div>
                    {f.status === 'CLOSED' && <span className="badge">Archived</span>}
                    <Icon name="forward" small />
                  </button>
                </li>
              ))}
            </ul>
            {families.isSuccess && all.length > 0 && matches.length === 0 && <Empty title="No families found" />}
          </section>
          {wide && (detail || <section className="card"><Empty title="Select a family">Its members, needs and referrals show here.</Empty></section>)}
        </div>

        <IncomingReferrals orgId={activeOrgId} onView={(familyId) => setSheet({ type: 'referred', familyId })} />
      </div>

      {!wide && selected && <Sheet title={selected.name} onClose={() => setSelectedId(null)}>{detail}</Sheet>}

      {sheet?.type === 'new' && <NewFamilySheet orgId={activeOrgId} people={people.data ?? []} onClose={() => setSheet(null)} />}
      {sheet?.type === 'edit' && <EditFamilySheet orgId={activeOrgId} family={sheet.family} people={people.data ?? []} onClose={() => setSheet(null)} />}
      {sheet?.type === 'refer' && <ReferSheet orgId={activeOrgId} family={sheet.family} onClose={() => setSheet(null)} />}
      {sheet?.type === 'referred' && <ReferredFamilySheet familyId={sheet.familyId} onClose={() => setSheet(null)} />}
      {sheet?.type === 'care' && (
        <CarePlanSheet orgId={activeOrgId} subject={{ kind: 'family', id: sheet.family.familyId, name: sheet.family.name }} onClose={() => setSheet(null)} />
      )}
    </>
  )
}
