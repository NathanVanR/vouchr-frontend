import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { withdrawConsent } from '../../lib/api.js'
import { openConsentPdf } from '../../lib/consentPdf.js'
import { fullName, initials } from '../../lib/format.js'
import { CONSENT_LABELS } from '../../lib/labels.js'
import { useAuth } from '../../auth/useAuth.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { useMediaQuery } from '../../hooks/useMediaQuery.js'
import { peopleKey, usePeople } from '../../hooks/people.js'
import { useDialogs } from '../../dialogs/useDialogs.js'
import { useToast } from '../../toast/useToast.js'
import PageHero from '../../components/PageHero.jsx'
import Empty from '../../components/Empty.jsx'
import Icon from '../../components/Icon.jsx'
import Sheet from '../../components/Sheet.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'
import CarePlanSheet from '../care/CarePlanSheet.jsx'
import HistorySheet from '../care/HistorySheet.jsx'
import ProfileRequestSheet from './ProfileRequestSheet.jsx'
import ConsentFlow from './ConsentFlow.jsx'
import PersonDetail from './PersonDetail.jsx'
import { canCaptureForChild, consentTone } from './personHelpers.js'
import PersonSheet from './PersonSheet.jsx'

const PAGE_SIZE = 40

export default function People() {
  const { activeOrgId, activeOrg } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { prompt } = useDialogs()
  const people = usePeople(activeOrgId)
  const wide = useMediaQuery('(min-width: 1000px)')

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [personSheet, setPersonSheet] = useState(null) // { personId } (null id = add a new person)
  const [consent, setConsent] = useState(null) // { signerPersonId, coverPersonIds }
  const [carePlan, setCarePlan] = useState(null) // the person whose care plan is open
  const [history, setHistory] = useState(null) // the person whose history is open
  const [askPartner, setAskPartner] = useState(null) // the person a partner is being asked to complete

  const all = people.data ?? []
  const selected = all.find((p) => p.personId === selectedId) || null
  const q = query.trim().toLowerCase()
  const sorted = [...all].sort((a, b) => fullName(a).localeCompare(fullName(b)))
  const matches = (q ? sorted.filter((p) => `${p.name} ${p.surname} ${p.school || ''}`.toLowerCase().includes(q)) : sorted)
  const shown = matches.slice(0, PAGE_SIZE)

  const signed = all.filter((p) => p.consentStatus === 'VALID').length

  const withdraw = useApiMutation(({ consentId, reason }) => withdrawConsent(consentId, reason), {
    invalidate: [peopleKey(activeOrgId), ['families', activeOrgId]],
    success: 'Consent withdrawn.',
  })

  async function onWithdraw(person) {
    // one consent can cover a guardian and their children, and withdrawing it withdraws it for all of them
    const covered = all.filter((p) => p.consentId === person.consentId).map(fullName)
    const reason = await prompt({
      title: 'Withdraw this consent?',
      message: `It covers: ${covered.join(', ')}.\n\nNone of them can be enrolled in a project any more, and they will be hidden from partner organisations.`,
      label: 'Reason (optional)',
      confirmLabel: 'Withdraw consent',
    })
    if (reason === null) return
    withdraw.mutate({ consentId: person.consentId, reason })
  }

  async function onViewCopy(person) {
    const problem = await openConsentPdf(person.consentId)
    if (problem) toast(problem, 'error')
  }

  function onPersonDone(person, { captureConsent, editing }) {
    setPersonSheet(null)
    toast(editing ? 'Details saved.' : 'Person added.')
    if (!captureConsent) return
    const fresh = queryClient.getQueryData(peopleKey(activeOrgId)) ?? all
    if (person.ageGroup === 'CHILD') {
      if (canCaptureForChild(person, fresh)) setConsent({ coverPersonIds: [person.personId] })
      else toast(`Put ${person.name} in a family with a parent or guardian on the Families tab, then capture consent.`)
    } else {
      setConsent({ signerPersonId: person.personId }) // an adult signs for themselves
    }
  }

  const detail = selected && (
    <PersonDetail
      person={selected}
      people={all}
      onEdit={(p) => setPersonSheet({ personId: p.personId })}
      onCarePlan={(p) => setCarePlan(p)}
      onHistory={(p) => setHistory(p)}
      onAskPartner={(p) => setAskPartner(p)}
      onCapture={(p) => setConsent({ signerPersonId: p.personId })}
      onCaptureChild={(p) => setConsent({ coverPersonIds: [p.personId] })}
      onWithdraw={onWithdraw}
      onViewCopy={onViewCopy}
    />
  )

  return (
    <>
      <PageHero
        eyebrow={activeOrg?.name}
        title="People"
        stats={[
          { value: people.data ? all.length : '–', label: 'People' },
          { value: people.data ? signed : '–', label: 'Consent signed' },
          { value: people.data ? all.length - signed : '–', label: 'Need consent' },
        ]}
        action={{ label: 'Add a person', onClick: () => setPersonSheet({ personId: null }) }}
      />

      <div className="page-body">
        <div className="split">
          <section className="card">
            <div className="field" style={{ marginBottom: 6 }}>
              <label htmlFor="people-search">Find a person</label>
              <input id="people-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or school…" autoComplete="off" />
            </div>

            {people.isPending && <CardSkeletons count={4} height={52} />}
            {people.isError && <p className="message error">{people.error.message || 'Failed to load people.'}</p>}
            {people.isSuccess && all.length === 0 && (
              <Empty title="Nobody has been added yet">Tap the yellow button to add the first person. Only a name and surname are needed.</Empty>
            )}
            {people.isSuccess && all.length > 0 && matches.length === 0 && <Empty title="No one found" />}
            <ul>
              {shown.map((p) => (
                <li key={p.personId}>
                  <button
                    type="button"
                    className={`row-button${p.personId === selectedId && wide ? ' is-selected' : ''}`}
                    onClick={() => setSelectedId(p.personId)}
                  >
                    <div className="avatar">{initials(fullName(p))}</div>
                    <div className="grow">
                      <strong>{fullName(p)}</strong>
                      <div className="meta">{p.ageGroup === 'CHILD' ? 'Child' : p.ageGroup === 'ADULT' ? 'Adult' : 'Age unknown'}{p.school ? ` · ${p.school}` : ''}</div>
                    </div>
                    <span className={`badge ${consentTone(p.consentStatus)}`}>{p.consentStatus === 'VALID' ? 'Signed' : CONSENT_LABELS[p.consentStatus] || p.consentStatus}</span>
                    <Icon name="forward" small />
                  </button>
                </li>
              ))}
            </ul>
            {matches.length > shown.length && (
              <p className="muted small mt">Showing {shown.length} of {matches.length}. Search to narrow the list.</p>
            )}
          </section>

          {wide && (detail || (
            <section className="card"><Empty title="Select a person">Their details, consent and care plan show here.</Empty></section>
          ))}
        </div>
      </div>

      {!wide && selected && (
        <Sheet title={fullName(selected)} onClose={() => setSelectedId(null)}>
          {detail}
        </Sheet>
      )}

      {personSheet && (
        <PersonSheet
          orgId={activeOrgId}
          personId={personSheet.personId}
          people={all}
          onDone={onPersonDone}
          onClose={() => setPersonSheet(null)}
        />
      )}
      {consent && (
        <ConsentFlow
          orgId={activeOrgId}
          people={all}
          signerPersonId={consent.signerPersonId}
          coverPersonIds={consent.coverPersonIds}
          onDone={() => toast('Consent saved.')}
          onClose={() => setConsent(null)}
        />
      )}
      {askPartner && <ProfileRequestSheet orgId={activeOrgId} person={askPartner} onClose={() => setAskPartner(null)} />}
      {history && <HistorySheet person={history} onClose={() => setHistory(null)} />}
      {carePlan && (
        <CarePlanSheet
          orgId={activeOrgId}
          subject={{ kind: 'person', id: carePlan.personId, name: fullName(carePlan), familyId: carePlan.familyId || null }}
          onClose={() => setCarePlan(null)}
        />
      )}
    </>
  )
}
