// Key dates within a project (a collection day, a handout, a fundraiser). They are calendar events linked to the project, so they also
// show on the Area calendar unless the project or the date is hidden from the area view. The project's overall run is set in its settings.
import { useState } from 'react'
import { EVENT_TYPE_LABELS } from '../../lib/labels.js'
import { projectDates } from '../../lib/format.js'
import { useProjectEvents } from '../../hooks/projects.js'
import EventSheet from '../area/EventSheet.jsx'
import { eventDates } from '../area/calendarHelpers.js'

export default function DatesCard({ project }) {
  const events = useProjectEvents(project.projectId)
  const [sheet, setSheet] = useState(null) // { event? }
  const list = events.data ?? []
  // only the organisation that runs the project schedules its dates
  const canSchedule = project.canEdit && !project.participant && project.status === 'ACTIVE'
  const run = projectDates(project)

  if (!canSchedule && !run && events.isSuccess && list.length === 0) return null

  return (
    <section className="card">
      <div className="row-between">
        <h2>Dates</h2>
        {canSchedule && <button type="button" className="btn btn-sm" onClick={() => setSheet({})}>Add a date</button>}
      </div>
      {run && <p className="muted">Runs: {run}</p>}
      {events.isError && <p className="message error">{events.error.message || 'Could not load the dates.'}</p>}
      <ul className="mt">
        {list.map((e) => (
          <li key={e.eventId} className="list-row" style={{ alignItems: 'flex-start' }}>
            <div className="grow">
              <strong>{e.title}</strong>
              <div className="meta">
                {eventDates(e)}{e.timeNote ? ` · ${e.timeNote}` : ''}{e.location ? ` · ${e.location}` : ''}
              </div>
              <div className="badges" style={{ marginTop: 6 }}>
                <span className="badge">{e.eventType === 'OTHER' ? e.typeLabel : EVENT_TYPE_LABELS[e.eventType]}</span>
                {e.hiddenFromArea && <span className="badge warn">Hidden from the area</span>}
              </div>
            </div>
            {canSchedule && <button type="button" className="link-btn" onClick={() => setSheet({ event: e })}>Edit</button>}
          </li>
        ))}
        {events.isSuccess && list.length === 0 && <li className="muted">No key dates yet.</li>}
      </ul>
      {sheet && (
        <EventSheet
          orgId={project.organizationId}
          projectId={project.projectId}
          event={sheet.event}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  )
}
