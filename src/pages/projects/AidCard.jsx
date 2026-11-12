import { useState } from 'react'
import { giveAid, openProjectSession, undoAid } from '../../lib/api.js'
import { formatDay, fullName, plural, todayIso } from '../../lib/format.js'
import { useApiMutation } from '../../hooks/useApiMutation.js'
import { useDialogs } from '../../dialogs/useDialogs.js'
import { useToast } from '../../toast/useToast.js'
import { projectKeys, useAidSession, useSessions } from '../../hooks/projects.js'
import Field from '../../components/Field.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'

function SessionDetail({ project, sessionId, enrolled }) {
  const { prompt } = useDialogs()
  const toast = useToast()
  const session = useAidSession(sessionId)
  const [note, setNote] = useState('')
  const [query, setQuery] = useState('')
  const refresh = [projectKeys.session(sessionId), projectKeys.sessions(project.projectId)]

  const give = useApiMutation(
    ({ personId, overrideReason }) =>
      giveAid(sessionId, { personId, note: note.trim() || null, ...(overrideReason && { overrideReason }) }),
    { invalidate: refresh, quiet: true },
  )
  const undo = useApiMutation((handoverId) => undoAid(handoverId), { invalidate: refresh })

  async function onGive(personId) {
    try {
      await give.mutateAsync({ personId })
      setQuery('')
    } catch (err) {
      // a project that only warns about its prerequisite lets staff continue with a reason
      if (!/Give a reason/.test(err.message || '')) return toast(err.message || 'Could not record that', 'error')
      const reason = await prompt({ title: 'Prerequisite not met', message: err.message, label: 'Reason', required: true, confirmLabel: 'Give aid anyway' })
      if (!reason) return undefined
      try {
        await give.mutateAsync({ personId, overrideReason: reason })
        setQuery('')
      } catch (err2) {
        toast(err2.message || 'Could not record that', 'error')
      }
    }
    return undefined
  }

  if (session.isPending) return <Skeleton height={120} />
  if (session.isError) return <p className="message error">{session.error.message || 'Could not open the session.'}</p>

  const s = session.data
  const given = new Set((s.handovers || []).map((h) => h.personId))
  const q = query.trim().toLowerCase()
  const matches = q
    ? enrolled.filter((p) => p.consentStatus === 'VALID' && !given.has(p.personId) && fullName(p).toLowerCase().includes(q)).slice(0, 8)
    : []

  return (
    <div className="mt">
      <h3>
        {s.label || 'Session'} · {formatDay(s.date)} <span className="muted small">run by {s.organizationName}</span>
      </h3>
      {s.canGive ? (
        <div className="mt">
          <Field label="What is being handed over (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} placeholder="e.g. hot meal" />
          </Field>
          <div className="field">
            <label htmlFor="aid-search">Find an enrolled person</label>
            <input id="aid-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name…" autoComplete="off" />
            {q && (
              <ul className="search-results">
                {matches.map((p) => (
                  <li key={p.personId}>
                    <span>{fullName(p)}</span>
                    <button type="button" className="btn btn-sm" disabled={give.isPending} onClick={() => onGive(p.personId)}>Give aid</button>
                  </li>
                ))}
                {matches.length === 0 && <li className="muted">No one found. Only enrolled people can be given aid.</li>}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="muted">Only staff of the organisation running this session can tick people off.</p>
      )}

      <h4 className="mt">{plural(s.handoverCount, 'person has', 'people have')} received aid</h4>
      <ul>
        {(s.handovers || []).map((h) => (
          <li className="list-row" key={h.handoverId}>
            <div className="grow">
              {fullName(h)}
              <div className="meta">
                {h.note}
                {h.overrideReason && ` · prerequisite not met: ${h.overrideReason}`}
              </div>
            </div>
            {h.canUndo && (
              <button type="button" className="link-btn danger" disabled={undo.isPending} onClick={() => undo.mutate(h.handoverId)}>Undo</button>
            )}
          </li>
        ))}
        {(s.handovers || []).length === 0 && <li className="muted">Nobody yet.</li>}
      </ul>
      {s.hiddenHandoverCount > 0 && (
        <p className="muted small mt">
          {s.hiddenHandoverCount} more received aid but are not shown: they did not agree to be shared with partner organisations.
        </p>
      )}
    </div>
  )
}

/** Giving aid: start a session (e.g. a weekly soup run), then tick off the enrolled people who receive aid. */
export default function AidCard({ project, enrolOrgId, enrolled, canStart }) {
  const sessions = useSessions(project.projectId)
  const [openId, setOpenId] = useState(null)
  const [date, setDate] = useState(todayIso())
  const [label, setLabel] = useState('')

  const start = useApiMutation(
    () => openProjectSession(project.projectId, { organizationId: enrolOrgId, date: date || null, label: label.trim() || null }),
    {
      invalidate: [projectKeys.sessions(project.projectId)],
      onSuccess: (started) => { setLabel(''); setOpenId(started.sessionId) },
    },
  )

  return (
    <section className="card">
      <h2>Aid sessions</h2>
      <p className="muted">
        A session is one occasion on which aid is given, such as a weekly soup run. Start one, then tick off each enrolled person who
        receives aid.
      </p>

      {canStart && (
        <form className="mt" onSubmit={(e) => { e.preventDefault(); start.mutate() }}>
          <div className="field-row">
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Name (optional)">
              <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} placeholder="e.g. Tuesday soup run" />
            </Field>
          </div>
          <button type="submit" className="btn" disabled={start.isPending}>{start.isPending ? 'Starting…' : 'Start session'}</button>
        </form>
      )}

      <ul className="mt">
        {(sessions.data ?? []).map((s) => (
          <li className="list-row" key={s.sessionId}>
            <div className="grow">
              <button type="button" className="session-pick" onClick={() => setOpenId(s.sessionId)}>
                {s.label || 'Session'} · {formatDay(s.date)}
              </button>
              <div className="meta">{s.organizationName} · {plural(s.handoverCount, 'person', 'people')}</div>
            </div>
          </li>
        ))}
        {sessions.isSuccess && sessions.data.length === 0 && <li className="muted">No sessions yet.</li>}
      </ul>
      {sessions.isPending && <Skeleton height={48} />}
      {sessions.isError && <p className="message error">{sessions.error.message || 'Could not load sessions'}</p>}

      {openId && <SessionDetail key={openId} project={project} sessionId={openId} enrolled={enrolled} />}
    </section>
  )
}
