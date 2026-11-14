// Schedule (or edit) an event so other organisations in the area can see it. A fundraiser on dates another organisation already
// has one gets a warning before saving: the point is to talk to each other, so it never blocks.
import { useState } from 'react'
import { createAreaEvent, deleteAreaEvent, updateAreaEvent } from '../../lib/api.js'
import { EVENT_TYPE_LABELS } from '../../lib/labels.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { useAreaClashes } from '../../hooks/area.js'
import { useProjects } from '../../hooks/projects.js'
import { useDialogs } from '../../dialogs/useDialogs.js'
import DateInput from '../../components/DateInput.jsx'
import Field from '../../components/Field.jsx'
import Sheet from '../../components/Sheet.jsx'
import { eventDates, todayDay } from './calendarHelpers.js'

/** projectId: set when opened from a project's page; the event is then tied to that project and the project choice is hidden. */
export default function EventSheet({ orgId, event, defaultDay, projectId = null, onClose }) {
  const editing = !!event
  const { confirm } = useDialogs()
  const projects = useProjects(orgId)
  const [f, setF] = useState({
    title: event?.title || '',
    eventType: event?.eventType || 'FUNDRAISER',
    typeLabel: event?.typeLabel || '',
    startsOn: event?.startsOn || defaultDay || todayDay(),
    endsOn: event && event.endsOn !== event.startsOn ? event.endsOn : '',
    timeNote: event?.timeNote || '',
    location: event?.location || '',
    description: event?.description || '',
    projectId: event?.projectId || projectId || '',
    hiddenFromArea: !!event?.hiddenFromArea,
  })
  const [error, setError] = useState('')
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value })

  const clashes = useAreaClashes(orgId, f.startsOn, f.endsOn || f.startsOn, f.eventType)
  const ownProjects = (projects.data ?? []).filter((p) => p.organizationId === orgId && p.status === 'ACTIVE')

  const refresh = [['area-events'], ['area-clashes'], ['project-events']]
  const save = useApiMutation(
    (payload) => (editing ? updateAreaEvent(event.eventId, payload) : createAreaEvent(orgId, payload)),
    { invalidate: refresh, success: editing ? 'Event updated.' : 'Event added.', onSuccess: onClose },
  )
  const remove = useApiMutation(() => deleteAreaEvent(event.eventId), { invalidate: refresh, success: 'Event removed.', onSuccess: onClose })

  function submit(e) {
    e.preventDefault()
    if (!f.title.trim()) return setError('Give the event a title.')
    if (f.eventType === 'OTHER' && !f.typeLabel.trim()) return setError('Say what kind of event this is.')
    if (f.endsOn && f.endsOn < f.startsOn) return setError('The event cannot end before it starts.')
    setError('')
    save.mutate({
      title: f.title.trim(),
      eventType: f.eventType,
      typeLabel: f.eventType === 'OTHER' ? f.typeLabel.trim() : null,
      startsOn: f.startsOn,
      endsOn: f.endsOn || null,
      timeNote: f.timeNote.trim() || null,
      location: f.location.trim() || null,
      description: f.description.trim() || null,
      projectId: f.projectId || null,
      hiddenFromArea: f.hiddenFromArea,
    })
    return undefined
  }

  async function onDelete() {
    const ok = await confirm({ title: 'Remove this event?', message: 'It disappears from the calendar.', confirmLabel: 'Remove', danger: true })
    if (ok) remove.mutate()
  }

  return (
    <Sheet title={editing ? 'Edit event' : 'Add an event'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Title">
          <input value={f.title} onChange={set('title')} maxLength={120} placeholder="e.g. Bake sale at the market" autoFocus />
        </Field>
        <Field label="Type">
          <select value={f.eventType} onChange={set('eventType')}>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        {f.eventType === 'OTHER' && (
          <Field label="What kind of event?"><input value={f.typeLabel} onChange={set('typeLabel')} maxLength={100} /></Field>
        )}
        <div className="field-row">
          <Field label="Starts"><DateInput value={f.startsOn} onChange={(startsOn) => setF({ ...f, startsOn })} required /></Field>
          <Field label="Ends (optional)"><DateInput value={f.endsOn} min={f.startsOn || undefined} onChange={(endsOn) => setF({ ...f, endsOn })} /></Field>
        </div>

        {clashes.data?.length > 0 && (
          <div className="message" role="status">
            <strong>Heads up:</strong> another organisation already has a fundraiser on these dates.
            <ul>
              {clashes.data.map((c) => <li key={c.eventId}>{c.organizationName}: {c.title} ({eventDates(c)})</li>)}
            </ul>
            You can still go ahead, but it may be worth talking to them first.
          </div>
        )}

        <Field label="Time (optional)"><input value={f.timeNote} onChange={set('timeNote')} maxLength={100} placeholder="e.g. 09:00 to 13:00" /></Field>
        <Field label="Where (optional)"><input value={f.location} onChange={set('location')} maxLength={255} /></Field>
        <Field label="Details (optional)"><input value={f.description} onChange={set('description')} maxLength={1000} /></Field>
        {!projectId && ownProjects.length > 0 && (
          <Field label="Part of a project (optional)">
            <select value={f.projectId} onChange={set('projectId')}>
              <option value="">Not part of a project</option>
              {ownProjects.map((p) => <option key={p.projectId} value={p.projectId}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <label className="check-row">
          <input type="checkbox" checked={f.hiddenFromArea} onChange={(e) => setF({ ...f, hiddenFromArea: e.target.checked })} />
          Keep this out of the area view (other organisations will not see it)
        </label>

        {error && <p className="message error" role="alert">{error}</p>}
        <div className="sheet-actions">
          {editing && <button type="button" className="btn btn-ghost" disabled={remove.isPending} onClick={onDelete}>Remove</button>}
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={save.isPending}>{save.isPending ? 'Saving…' : editing ? 'Save' : 'Add event'}</button>
        </div>
      </form>
    </Sheet>
  )
}
