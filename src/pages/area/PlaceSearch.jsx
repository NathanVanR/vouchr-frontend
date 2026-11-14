// Choose which area to look at: our own (the default), any city or suburb that has organisations, or every area. Places come from
// organisations' addresses, so only places with at least one organisation can be found.
import { useState } from 'react'
import { useDebounced } from '../../hooks/useDebounced.js'
import { useAreaPlaces } from '../../hooks/area.js'
import { placeLabel } from './calendarHelpers.js'

const countLabel = (n) => `${n} ${n === 1 ? 'organisation' : 'organisations'}`

export default function PlaceSearch({ orgId, place, ownCity, onChange }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const q = useDebounced(query.trim(), 250)
  const places = useAreaPlaces(orgId, q, focused)
  const list = places.data ?? []

  function choose(next) {
    onChange(next)
    setQuery('')
    setFocused(false)
  }

  return (
    <section className="card">
      <h2>Where</h2>
      <p className="muted">
        Showing <strong>{placeLabel(place, ownCity)}</strong>. Search any city or suburb to see what organisations there are working on.
      </p>
      <div className="actions mt">
        {place && <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose(null)}>Back to our area</button>}
        {!place?.all && <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose({ all: true })}>All areas</button>}
      </div>

      <div className="field mt">
        <label htmlFor="place-search">Search a city or suburb</label>
        <input
          id="place-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="e.g. Durban, Randburg…"
          autoComplete="off"
        />
        <span className="field-hint">Only places with registered organisations are listed.</span>
      </div>

      {focused && (
        <ul className="search-results" aria-label="Places">
          {places.isPending && <li className="muted">Searching…</li>}
          {places.isError && <li className="message error">{places.error.message || 'Could not search places.'}</li>}
          {places.isSuccess && list.length === 0 && <li className="muted">No places found. Try another spelling.</li>}
          {list.map((p) => (
            <li key={`${p.city}|${p.suburb || ''}`}>
              <span>
                {p.suburb ? `${p.suburb}, ${p.city}` : p.city}
                <span className="muted small"> · {countLabel(p.organizationCount)}{p.suburb ? '' : ' in the city'}</span>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose({ city: p.city, suburb: p.suburb || null })}>Show</button>
            </li>
          ))}
          <li><button type="button" className="link-btn" onClick={() => setFocused(false)}>Close</button></li>
        </ul>
      )}
    </section>
  )
}
