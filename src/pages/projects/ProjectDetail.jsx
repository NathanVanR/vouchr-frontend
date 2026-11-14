import { Link, useParams } from 'react-router-dom'
import { projectDates } from '../../lib/format.js'
import { PROJECT_MODE_LABELS, projectTypeName, serviceName } from '../../lib/labels.js'
import { useAuth } from '../../auth/useAuth.js'
import { useBeneficiaries, useParticipants, useProject } from '../../hooks/projects.js'
import PageHero from '../../components/PageHero.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'
import SettingsCard from './SettingsCard.jsx'
import ParticipantsCard from './ParticipantsCard.jsx'
import EnrolCard from './EnrolCard.jsx'
import EnrolledPeople from './EnrolledPeople.jsx'
import StockCard from './StockCard.jsx'
import ReceiveCard from './ReceiveCard.jsx'
import HandoutCard from './HandoutCard.jsx'
import ActivityCard from './ActivityCard.jsx'
import DatesCard from './DatesCard.jsx'

export default function ProjectDetail() {
  const { id } = useParams()
  const { orgs, activeOrgId } = useAuth()
  const project = useProject(id)
  const participants = useParticipants(id)
  const beneficiaries = useBeneficiaries(id)

  if (project.isPending) {
    return (
      <>
        <PageHero title="Project" back={{ to: '/app/projects', label: 'Projects' }} />
        <div className="page-body"><CardSkeletons count={3} /></div>
      </>
    )
  }
  if (project.isError) {
    return (
      <>
        <PageHero title="Project" back={{ to: '/app/projects', label: 'Projects' }} />
        <div className="page-body">
          <p className="message error">{project.error.message || 'Could not load this project.'}</p>
          <Link to="/app/projects" className="btn btn-ghost">Back to projects</Link>
        </div>
      </>
    )
  }

  const p = project.data
  const people = participants.data ?? []

  // The organisation whose people we enrol: the active one when it takes part, otherwise one of ours that does.
  const involved = new Set([p.organizationId, ...people.filter((x) => x.status === 'ACTIVE').map((x) => x.organizationId)])
  const mine = Object.keys(orgs).filter((orgId) => involved.has(orgId))
  const enrolOrgId = mine.includes(activeOrgId) ? activeOrgId : mine[0] || p.organizationId

  const canAdd = p.canEdit && p.status === 'ACTIVE'
  const collects = p.mode !== 'DISTRIBUTE'
  const gives = p.mode !== 'COLLECT'
  // people are only enrolled when the project gives things out and records who got them
  const named = gives && !p.openHandout

  return (
    <>
      <PageHero
        back={{ to: '/app/projects', label: 'Projects' }}
        eyebrow={`${projectTypeName(p.projectType, p.typeLabel)} · ${p.organizationName}`}
        title={p.name}
        subtitle={[projectDates(p), p.description].filter(Boolean).join(' · ') || undefined}
      />

      <div className="page-body">
        <div className="badges">
          {p.status === 'ARCHIVED' && <span className="badge">Archived</span>}
          {p.participant && <span className="badge ok">Joined</span>}
          <span className="badge">{PROJECT_MODE_LABELS[p.mode] || p.mode}</span>
          {p.openHandout && <span className="badge info">Open handout: no names</span>}
          {p.requiredServiceType && (
            <span className="badge info">
              Requires {serviceName(p.requiredServiceType).toLowerCase()}
            </span>
          )}
        </div>

        {p.participant && (
          <p className="message">
            This project is run by {p.organizationName}. You can enrol your own people in it; only they can change its settings.
          </p>
        )}

        {p.canAdmin && <SettingsCard key={`${p.status}-${p.mode}-${p.openHandout}-${p.hiddenFromArea}-${p.startsOn}-${p.endsOn}-${p.requiredServiceType}-${p.requirementEnforcement}`} project={p} />}
        {(p.canEdit || p.canAdmin) && (
          <ParticipantsCard project={p} participants={people} enrolOrgId={enrolOrgId} />
        )}
        <DatesCard project={p} />
        <StockCard project={p} />
        {canAdd && collects && <ReceiveCard project={p} enrolOrgId={enrolOrgId} />}
        {canAdd && gives && <HandoutCard project={p} enrolOrgId={enrolOrgId} enrolled={beneficiaries.data ?? []} />}
        <ActivityCard project={p} />
        {named && canAdd && <EnrolCard project={p} enrolOrgId={enrolOrgId} enrolled={beneficiaries.data ?? []} />}
        {named && <EnrolledPeople project={p} participants={people} beneficiaries={beneficiaries} />}
      </div>
    </>
  )
}
