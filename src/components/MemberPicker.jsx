import { useState } from 'react'
import { fullName } from '../lib/format.js'

/**
 * Search-and-pick for people: type to find someone, tap Add, remove with the ×.
 * Used for family members and for the children covered by a consent.
 *
 * candidates  the people that can be picked      selected  array of chosen person ids
 * onChange    called with the new array of ids   emptyText shown when there is nobody to pick
 */
export default function MemberPicker({
  candidates, selected, onChange, emptyText = 'Nobody to choose from.', placeholder = 'Search by name or school…',
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const chosen = candidates.filter((p) => selected.includes(p.personId))
  const matches = q
    ? candidates
        .filter((p) => !selected.includes(p.personId))
        .filter((p) => `${p.name} ${p.surname} ${p.school || ''}`.toLowerCase().includes(q))
        .slice(0, 8)
    : []

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label="Search people"
        disabled={candidates.length === 0}
      />
      {q && (
        <ul className="search-results">
          {matches.map((p) => (
            <li key={p.personId}>
              <span>
                {fullName(p)}
                <span className="muted small">
                  {p.ageGroup === 'CHILD' ? ' · child' : ''}
                  {p.school ? ` · ${p.school}` : ''}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { onChange([...selected, p.personId]); setQuery('') }}
              >
                Add
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="muted">No one found.</li>}
        </ul>
      )}
      {candidates.length === 0 && <p className="muted small mt">{emptyText}</p>}
      {chosen.length > 0 && (
        <div className="mt">
          {chosen.map((p) => (
            <span className="mp-chip" key={p.personId}>
              {fullName(p)}
              <button type="button" aria-label={`Remove ${fullName(p)}`} onClick={() => onChange(selected.filter((id) => id !== p.personId))}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
