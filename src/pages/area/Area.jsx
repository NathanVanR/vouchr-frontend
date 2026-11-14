// The area view: other organisations in the same city, their projects, and a shared calendar, so efforts (two bake sales on one
// weekend, say) are not duplicated. The area comes from each organisation's address; there is no hub to join. Only names,
// projects and events are shown here, never anything about the people an organisation helps.
import { useState } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { useAreaCities, useAreaOrganizations } from '../../hooks/area.js'
import PageHero from '../../components/PageHero.jsx'
import Empty from '../../components/Empty.jsx'
import { CardSkeletons } from '../../components/Skeleton.jsx'
import AreaCalendar from './AreaCalendar.jsx'
import AreaOrgSheet from './AreaOrgSheet.jsx'
import EventSheet from './EventSheet.jsx'
import PlaceSearch from './PlaceSearch.jsx'
import { placeLabel } from './calendarHelpers.js'

export default function Area() {
  const { activeOrgId, activeOrg, isAdmin } = useAuth()
  const [place, setPlace] = useState(null) // null = our own city, { city, suburb }, or { all: true }
  const [query, setQuery] = useState('')
  const [org, setOrg] = useState(null)
  const [eventSheet, setEventSheet] = useState(null) // { event?, day? }

  const cities = useAreaCities(activeOrgId)
  const orgs = useAreaOrganizations(activeOrgId, place)
  const ownCity = cities.data?.defaultCity || null
  const label = placeLabel(place, ownCity)

  const q = query.trim().toLowerCase()
  const list = (orgs.data ?? []).filter((o) => !q || o.name.toLowerCase().includes(q) || (o.suburb || '').toLowerCase().includes(q))

  return (
    <>
      <PageHero
        eyebrow={activeOrg?.name}
        title="Area"
        subtitle={place || ownCity ? `What organisations in ${label.replace(' (our area)', '')} are working on` : 'Add a city to your organisation\u2019s address to see your area, or search for a place'}
        stats={[
          { value: orgs.data ? orgs.data.length : '–', label: 'Organisations' },
          { value: orgs.data ? orgs.data.reduce((n, o) => n + o.projectCount, 0) : '–', label: 'Projects shown' },
        ]}
        action={{ label: 'Add an event', onClick: () => setEventSheet({}) }}
      />

      <div className="page-body">
        <PlaceSearch orgId={activeOrgId} place={place} ownCity={ownCity} onChange={(next) => { setPlace(next); setQuery('') }} />

        <AreaCalendar
          orgId={activeOrgId}
          place={place}
          onAdd={(day) => setEventSheet({ day })}
          onOpen={(event) => setEventSheet({ event })}
        />

        <section className="card">
          <h2>Organisations in {label.replace(' (our area)', '')}</h2>
          <p className="muted">Tap an organisation to see what it is running and ask to join a project. They can hide projects they do not want shown.</p>
          <div className="field mt">
            <label htmlFor="area-search">Search these organisations</label>
            <input id="area-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or suburb…" autoComplete="off" />
          </div>
          {orgs.isPending && <CardSkeletons count={2} height={70} />}
          {orgs.isError && <p className="message error">{orgs.error.message || 'Could not load the area.'}</p>}
          {orgs.isSuccess && list.length === 0 && (
            <Empty title={orgs.data.length === 0 ? 'No other organisations here yet' : 'No match'}>
              {orgs.data.length === 0
                ? 'Other organisations appear once they have registered with an address in this place. Try searching for another city or suburb above.'
                : 'Try a different name or suburb.'}
            </Empty>
          )}
          <ul className="mt">
            {list.map((o) => (
              <li key={o.organizationId}>
                <button type="button" className="row-button" onClick={() => setOrg(o)}>
                  <div className="grow">
                    <strong>{o.name}</strong>
                    <div className="meta">{[o.suburb, o.city].filter(Boolean).join(', ')}</div>
                  </div>
                  {o.partner && <span className="badge ok">Partner</span>}
                  <span className="badge">{o.projectCount} {o.projectCount === 1 ? 'project' : 'projects'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {org && <AreaOrgSheet org={org} forOrgId={activeOrgId} isAdmin={isAdmin} onClose={() => setOrg(null)} />}
      {eventSheet && (
        <EventSheet orgId={activeOrgId} event={eventSheet.event} defaultDay={eventSheet.day} onClose={() => setEventSheet(null)} />
      )}
    </>
  )
}
