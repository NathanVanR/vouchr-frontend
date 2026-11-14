// What one organisation in the area is running, with a button per project to ask to join. The owner's admin answers the request.
// Only projects the organisation has not hidden from the area view are listed.
import { requestToJoinProject } from '../../lib/api.js'
import { AREA_RELATIONSHIP_LABELS, PROJECT_MODE_LABELS, projectTypeName } from '../../lib/labels.js'
import { projectDates } from '../../lib/format.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { areaKeys, useAreaOrgProjects } from '../../hooks/area.js'
import { projectKeys } from '../../hooks/projects.js'
import Sheet from '../../components/Sheet.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

export default function AreaOrgSheet({ org, forOrgId, isAdmin, onClose }) {
  const projects = useAreaOrgProjects(org.organizationId, forOrgId)
  const join = useApiMutation((projectId) => requestToJoinProject(projectId, forOrgId), {
    invalidate: [areaKeys.projects(org.organizationId), projectKeys.list(forOrgId)],
    success: `Request sent. ${org.name}'s admin can accept it.`,
  })

  return (
    <Sheet title={org.name} onClose={onClose}>
      <p className="muted">
        {[org.suburb, org.city].filter(Boolean).join(', ')}{org.partner ? ' · One of our partners' : ''}
      </p>
      {projects.isPending && <Skeleton height={120} />}
      {projects.isError && <p className="message error">{projects.error.message || 'Could not load their projects.'}</p>}
      <ul className="mt">
        {(projects.data ?? []).map((p) => {
          const badge = AREA_RELATIONSHIP_LABELS[p.relationship]
          return (
            <li key={p.projectId} className="list-row" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <strong>{p.name}</strong>
                <div className="meta">{projectTypeName(p.projectType, p.typeLabel)} · {PROJECT_MODE_LABELS[p.mode] || p.mode}{p.startsOn ? ` · ${projectDates(p)}` : ''}</div>
                {p.description && <div className="muted small">{p.description}</div>}
                {badge && <div className="badges" style={{ marginTop: 6 }}><span className={`badge ${badge[0]}`}>{badge[1]}</span></div>}
              </div>
              {p.relationship === 'NONE' && (
                isAdmin
                  ? <button type="button" className="btn btn-sm" disabled={join.isPending} onClick={() => join.mutate(p.projectId)}>Request to join</button>
                  : <span className="muted small">An admin can ask to join</span>
              )}
            </li>
          )
        })}
        {projects.isSuccess && projects.data.length === 0 && <li className="muted">No projects are being shown by this organisation.</li>}
      </ul>
    </Sheet>
  )
}
