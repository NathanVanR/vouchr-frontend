// A month calendar of what organisations in the area have scheduled. Tapping a day lists its events; with no day chosen the whole
// month is listed. Fundraisers that overlap another organisation's are flagged: a warning to talk to each other, never a block.
import { useState } from 'react'
import { EVENT_TYPE_LABELS } from '../../lib/labels.js'
import { useAreaEvents } from '../../hooks/area.js'
import Icon from '../../components/Icon.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'
import { addMonths, eventCoversDay, eventDates, monthGrid, monthTitle, parseDay, todayDay } from './calendarHelpers.js'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function EventRow({ event: e, onOpen }) {
  const label = e.projectRun ? 'Project' : e.eventType === 'OTHER' ? e.typeLabel : EVENT_TYPE_LABELS[e.eventType]
  return (
    <li className="list-row" style={{ alignItems: 'flex-start' }}>
      <div className="grow">
        <strong>{e.title}</strong>
        <div className="meta">
          {e.projectRun ? `Runs ${eventDates(e)}` : eventDates(e)}{e.timeNote ? ` · ${e.timeNote}` : ''} · {e.organizationName}{e.location ? ` · ${e.location}` : ''}
        </div>
        {e.description && <div className="muted small">{e.description}</div>}
        <div className="badges mt" style={{ marginTop: 6 }}>
          <span className="badge">{label}</span>
          {e.projectName && !e.projectRun && <span className="badge info">{e.projectName}</span>}
          {e.clash && <span className="badge bad">Overlaps another fundraiser</span>}
          {e.hiddenFromArea && <span className="badge warn">Hidden from the area</span>}
        </div>
      </div>
      {e.canEdit && <button type="button" className="link-btn" onClick={() => onOpen(e)}>Edit</button>}
    </li>
  )
}

export default function AreaCalendar({ orgId, place, onAdd, onOpen }) {
  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState(null)

  const grid = monthGrid(view.year, view.month)
  const events = useAreaEvents(orgId, place, grid.from, grid.to)
  const list = events.data ?? []
  const today = todayDay()

  const inMonth = list.filter((e) => grid.days.some((d) => d.inMonth && eventCoversDay(e, d.iso)))
  const shown = selected ? list.filter((e) => eventCoversDay(e, selected)) : inMonth

  const move = (delta) => { setView(addMonths(view.year, view.month, delta)); setSelected(null) }

  return (
    <section className="card">
      <div className="cal-head">
        <button type="button" className="btn btn-ghost btn-sm" aria-label="Previous month" onClick={() => move(-1)}><Icon name="back" small /></button>
        <h3>{monthTitle(view.year, view.month)}</h3>
        <button type="button" className="btn btn-ghost btn-sm" aria-label="Next month" onClick={() => move(1)}><Icon name="forward" small /></button>
      </div>

      <div className="cal-grid" role="grid" aria-label={monthTitle(view.year, view.month)}>
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {grid.days.map((d) => {
          const dayEvents = list.filter((e) => eventCoversDay(e, d.iso))
          const cls = ['cal-day', d.inMonth ? '' : 'out', d.iso === today ? 'today' : '', selected === d.iso ? 'on' : ''].filter(Boolean).join(' ')
          return (
            <button
              key={d.iso}
              type="button"
              className={cls}
              aria-pressed={selected === d.iso}
              aria-label={`${parseDay(d.iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}, ${dayEvents.length} events`}
              onClick={() => setSelected(selected === d.iso ? null : d.iso)}
            >
              <span>{d.day}</span>
              <span className="cal-dots">
                {dayEvents.slice(0, 3).map((e) => (
                  <span key={e.eventId} className={`cal-dot${e.clash ? ' clash' : e.canEdit ? ' mine' : ''}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <p className="muted small mt">Green dots are other organisations, orange are ours, red are fundraisers that overlap. Projects with dates show for the days they run.</p>

      <div className="row-between mt">
        <h3>{selected ? parseDay(selected).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }) : 'This month'}</h3>
        <button type="button" className="btn btn-sm" onClick={() => onAdd(selected)}>Add an event</button>
      </div>
      {events.isPending && <CardSkeletons count={1} height={80} />}
      {events.isError && <p className="message error">{events.error.message || 'Could not load the calendar.'}</p>}
      <ul className="mt">
        {shown.map((e) => <EventRow key={e.eventId} event={e} onOpen={onOpen} />)}
        {events.isSuccess && shown.length === 0 && (
          <li className="muted">{selected ? 'Nothing scheduled on this day.' : 'Nothing scheduled this month.'}</li>
        )}
      </ul>
    </section>
  )
}
