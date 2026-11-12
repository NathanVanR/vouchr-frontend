import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchOrgs } from '../lib/api.js'
import { useDebounced } from '../hooks/useDebounced.js'

/**
 * Search organisations by name (2+ letters). Hides only the organisation being worked in, so one person who manages
 * several organisations can partner with or refer to another of them.
 */
export default function OrgSearch({ excludeOrgId, actionLabel = 'Choose', onChoose, label = 'Search organisations', disabled = false }) {
  const [query, setQuery] = useState('')
  const q = useDebounced(query.trim(), 250)
  const results = useQuery({
    queryKey: ['org-search', excludeOrgId, q],
    queryFn: () => searchOrgs(q, excludeOrgId),
    enabled: q.length >= 2,
    staleTime: 60_000,
  })

  return (
    <div className="field">
      <label htmlFor="org-search">{label}</label>
      <input id="org-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Start typing a name…" autoComplete="off" />
      {results.isError && <p className="message error">{results.error.message || 'Search failed'}</p>}
      {q.length >= 2 && results.isSuccess && (
        <ul className="search-results">
          {results.data.map((o) => (
            <li key={o.organizationId}>
              <span>
                {o.name}
                {o.city && <span className="muted small"> · {o.city}</span>}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled}
                onClick={() => { onChoose(o); setQuery('') }}
              >
                {actionLabel}
              </button>
            </li>
          ))}
          {results.data.length === 0 && <li className="muted">No organisations found.</li>}
        </ul>
      )}
    </div>
  )
}
