import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { answerProjectParticipant, inviteProjectParticipant } from '../../lib/api.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { useDialogs } from '../../dialogs/useDialogs.js'
import { projectKeys, usePartnerships } from '../../hooks/projects.js'
import Field from '../../components/Field.jsx'

const STATUS_BADGES = {
  PENDING: ['info', 'Invited'],
  ACTIVE: ['ok', 'Taking part'],
  DECLINED: ['bad', 'Declined'],
  ENDED: ['bad', 'Ended'],
}

/** Other organisations working on this project, and (for the owner's admin) inviting more of them. */
export default function ParticipantsCard({ project, participants, enrolOrgId }) {
  const navigate = useNavigate()
  const { confirm } = useDialogs()
  const [inviteId, setInviteId] = useState('')

  const partnerships = usePartnerships(project.organizationId, project.canAdmin && project.status === 'ACTIVE')

  // Active partners of the owner that are not already invited.
  const open = new Set(participants.filter((p) => p.status === 'PENDING' || p.status === 'ACTIVE').map((p) => p.organizationId))
  const options = (partnerships.data ?? [])
    .filter((p) => p.status === 'ACTIVE')
    .map((p) =>
      p.requesterOrganizationId === project.organizationId
        ? { id: p.partnerOrganizationId, name: p.partnerOrganizationName }
        : { id: p.requesterOrganizationId, name: p.requesterOrganizationName },
    )
    .filter((o) => !open.has(o.id))
  const chosen = options.some((o) => o.id === inviteId) ? inviteId : options[0]?.id || ''

  const invite = useApiMutation(() => inviteProjectParticipant(project.projectId, chosen), {
    invalidate: [projectKeys.participants(project.projectId)],
    success: 'Invitation sent. Their admin can accept it on their dashboard.',
  })
  const end = useApiMutation((participantId) => answerProjectParticipant(participantId, 'end'), {
    invalidate: [projectKeys.participants(project.projectId), projectKeys.beneficiaries(project.projectId), projectKeys.list(enrolOrgId)],
    success: 'Done.',
    // leaving as a participant takes us out of the project
    onSuccess: () => { if (project.participant) navigate('/app/projects', { replace: true }) },
  })

  async function onEnd(participant) {
    const ok = await confirm({
      title: participant.status === 'PENDING' ? 'Withdraw this invitation?' : 'End participation?',
      message: 'Their people are no longer shown here to the other organisation.',
      confirmLabel: 'Yes, end it',
      danger: true,
    })
    if (ok) end.mutate(participant.participantId)
  }

  return (
    <section className="card">
      <h2>Partners on this project</h2>
      <p className="muted">
        Other organisations can work on this project too. Only partner organisations can be invited, and they enrol their own
        people. Each organisation sees the other&apos;s people only when those people agreed to be shared with partners.
      </p>
      <ul className="mt">
        <li className="list-row">
          <div className="grow">
            <strong>{project.organizationName}</strong>
            <div className="meta">runs this project</div>
          </div>
        </li>
        {participants.map((p) => {
          const [tone, label] = STATUS_BADGES[p.status] || ['', p.status]
          return (
            <li className="list-row" key={p.participantId}>
              <div className="grow">
                {p.organizationName} <span className={`badge ${tone}`}>{label}</span>
              </div>
              {p.canEnd && (
                <button type="button" className="link-btn danger" onClick={() => onEnd(p)}>
                  {p.status === 'PENDING' ? 'Withdraw invitation' : p.organizationId === enrolOrgId && project.participant ? 'Leave project' : 'Remove'}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {project.canAdmin && project.status === 'ACTIVE' && (
        options.length > 0 ? (
          <div className="mt">
            <Field label="Invite a partner organisation">
              <select value={chosen} onChange={(e) => setInviteId(e.target.value)}>
                {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <button type="button" className="btn" disabled={invite.isPending} onClick={() => invite.mutate()}>
              {invite.isPending ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        ) : (
          !partnerships.isPending && (
            <p className="muted small mt">To invite another organisation, first agree a partnership with it on the Partners tab.</p>
          )
        )
      )}
    </section>
  )
}
