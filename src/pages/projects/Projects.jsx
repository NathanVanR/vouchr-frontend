import { useState } from 'react'
import { Link } from 'react-router-dom'
import { answerProjectParticipant } from '../../lib/api.js'
import { projectTypeName, serviceName } from '../../lib/labels.js'
import { useAuth } from '../../auth/useAuth.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { projectKeys, useProjectInvitations, useProjects } from '../../hooks/projects.js'
import { usePeople } from '../../hooks/people.js'
import PageHero from '../../components/PageHero.jsx'
import Empty from '../../components/Empty.jsx'
import Icon from '../../components/Icon.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'
import NewProjectSheet from './NewProjectSheet.jsx'

const FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['joined', 'Joined'],
  ['archived', 'Archived'],
]

const matches = (filter, p) =>
  filter === 'all' ||
  (filter === 'archived' && p.status === 'ARCHIVED') ||
  (filter === 'joined' && p.participant) ||
  (filter === 'active' && p.status !== 'ARCHIVED' && !p.participant)

function ProjectCard({ project }) {
  return (
    <Link className="project-card" to={`/app/projects/${encodeURIComponent(project.projectId)}`}>
      <span className="kicker">{projectTypeName(project.projectType, project.typeLabel)}</span>
      <strong>{project.name}</strong>
      {project.participant && <span className="muted small">Run by {project.organizationName}</span>}
      {project.description && <span className="muted">{project.description}</span>}
      <span className="badges">
        {project.status === 'ARCHIVED' && <span className="badge">Archived</span>}
        {project.participant && <span className="badge ok">Joined</span>}
        {project.requiredServiceType && (
          <span className="badge info">Requires {serviceName(project.requiredServiceType).toLowerCase()}</span>
        )}
      </span>
    </Link>
  )
}

function Invitations({ orgId, isAdmin }) {
  const { data: invitations = [] } = useProjectInvitations(orgId)
  const answer = useApiMutation(({ id, action }) => answerProjectParticipant(id, action), {
    invalidate: [projectKeys.list(orgId), projectKeys.invitations(orgId)],
    success: (_, { action }) => (action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.'),
  })
  if (!invitations.length) return null

  return (
    <>
      {invitations.map((i) => (
        <div className="invite-card" key={i.participantId}>
          <div className="dot"><Icon name="partners" /></div>
          <div className="grow">
            <strong>{i.ownerOrganizationName}</strong> invited us to <strong>{i.projectName}</strong>
            <div className="muted small">{projectTypeName(i.projectType, i.projectTypeLabel)}</div>
          </div>
          {isAdmin && i.canRespond ? (
            <div className="actions">
              <button type="button" className="btn btn-sm" disabled={answer.isPending} onClick={() => answer.mutate({ id: i.participantId, action: 'accept' })}>
                Accept
              </button>
              <button type="button" className="link-btn danger" disabled={answer.isPending} onClick={() => answer.mutate({ id: i.participantId, action: 'decline' })}>
                Decline
              </button>
            </div>
          ) : (
            <span className="muted small">An admin can answer</span>
          )}
        </div>
      ))}
    </>
  )
}

export default function Projects() {
  const { activeOrgId, activeOrg, isAdmin } = useAuth()
  const projects = useProjects(activeOrgId)
  const invitations = useProjectInvitations(activeOrgId)
  const people = usePeople(activeOrgId)
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  const list = (projects.data ?? []).filter((p) => matches(filter, p))
  const activeCount = (projects.data ?? []).filter((p) => p.status !== 'ARCHIVED').length

  return (
    <>
      <PageHero
        eyebrow={activeOrg?.name}
        title="Projects"
        stats={[
          { value: projects.data ? activeCount : '–', label: 'Active projects' },
          { value: people.data ? people.data.length : '–', label: 'People' },
          { value: invitations.data ? invitations.data.length : '–', label: 'Invitations' },
        ]}
        action={isAdmin ? { label: 'New project', onClick: () => setCreating(true) } : undefined}
      />

      <div className="page-body">
        <div className="chips" role="group" aria-label="Filter projects">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" className={`chip${filter === value ? ' on' : ''}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>

        <Invitations orgId={activeOrgId} isAdmin={isAdmin} />

        {projects.isPending && <CardSkeletons count={3} height={110} />}
        {projects.isError && <p className="message error">{projects.error.message || 'Failed to load projects.'}</p>}
        {projects.isSuccess && list.length === 0 && (
          <section className="card">
            <Empty title={filter === 'all' ? 'No projects yet' : 'Nothing here'}>
              {filter === 'all'
                ? isAdmin
                  ? 'Tap the yellow button to add your first project, such as a feeding scheme or a clothing drive.'
                  : 'An organisation admin can add a project.'
                : 'No projects match this filter.'}
            </Empty>
          </section>
        )}
        {list.length > 0 && (
          <div className="grid">
            {list.map((p) => (
              <ProjectCard key={p.projectId} project={p} />
            ))}
          </div>
        )}
      </div>

      {creating && <NewProjectSheet orgId={activeOrgId} onClose={() => setCreating(false)} />}
    </>
  )
}
