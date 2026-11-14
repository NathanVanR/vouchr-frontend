// Everything that has happened for one person: care plan check-ins and status changes (including closed items) and what they
// were given through projects, newest first. Staff of the person's own organisation only.
import { formatDateTime } from '../../lib/format.js'
import { useCareHistory } from '../../hooks/care.js'
import { useReceived } from '../../hooks/projects.js'
import { usePersonProfileRequests } from '../../hooks/people.js'
import Sheet from '../../components/Sheet.jsx'
import { Skeleton } from '../../components/Skeleton.jsx'
import { mergeHistory } from './careHelpers.js'

export default function HistorySheet({ person, onClose }) {
  const care = useCareHistory(person.personId)
  const received = useReceived(person.personId)
  const requests = usePersonProfileRequests(person.personId)
  const failed = [care, received, requests].find((q) => q.isError) || null
  const loading = care.isPending || received.isPending || requests.isPending
  const entries = loading || failed ? [] : mergeHistory(care.data, received.data, requests.data)

  return (
    <Sheet title={`History for ${person.name} ${person.surname}`} onClose={onClose}>
      {loading && <Skeleton height={160} />}
      {failed && <p className="message error">{failed.error.message || 'Could not load the history'}</p>}
      {!loading && !failed && (
        <>
          <p className="muted">
            Check-ins and changes on their care plan (and their family&apos;s), and what they have received through projects.
          </p>
          <ul className="mt">
            {entries.map((e) => (
              <li key={e.key} className="list-row">
                <div className="grow">
                  <strong>{e.title}</strong>
                  <div className="meta">{formatDateTime(e.at)}{e.meta ? ` · ${e.meta}` : ''}</div>
                </div>
              </li>
            ))}
            {entries.length === 0 && <li className="muted">Nothing has happened yet.</li>}
          </ul>
        </>
      )}
    </Sheet>
  )
}
