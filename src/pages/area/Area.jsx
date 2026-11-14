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

export default function Area() {
  const { activeOrgId, activeOrg, isAdmin } = useAuth()
  const [city, setCity] = useState(null) // null = our own city
  const [query, setQuery] = useState('')
  const [org, setOrg] = useState(null)
  const [eventSheet, setEventSheet] = useState(null) // { event?, day? }

  const cities = useAreaCities(activeOrgId)
  const orgs = useAreaOrganizations(activeOrgId, city)
  const shownCity = city || cities.data?.defaultCity || null

  const q = query.trim().toLowerCase()
  const list = (orgs.data ?? []).filter((o) => !q || o.name.toLowerCase().includes(q) || (o.suburb || '').toLowerCase().includes(q))
  const options = cities.data?.cities ?? []

  return (
    <>
      <PageHero
        eyebrow={activeOrg?.name}
        title="Area"
        subtitle={shownCity ? `What other organisations in ${shownCity} are working on` : 'Add a city to your organisation’s address to see your area'}
        stats={[
          { value: orgs.data ? orgs.data.length : '–', label: 'Organisations' },
          { value: orgs.data ? orgs.data.reduce((n, o) => n + o.projectCount, 0) : '–', label: 'Projects shown' },
        ]}
        action={{ label: 'Add an event', onClick: () => setEventSheet({}) }}
      >
        {options.length > 1 && (
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="area-city" className="sr-only">Area</label>
            <select id="area-city" value={city || ''} onChange={(e) => setCity(e.target.value || null)}>
              <option value="">{cities.data?.defaultCity ? `${cities.data.defaultCity} (our area)` : 'Our area'}</option>
              {options.filter((c) => c !== cities.data?.defaultCity).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </PageHero>

      <div className="page-body">
        <AreaCalendar
          orgId={activeOrgId}
          city={city}
          onAdd={(day) => setEventSheet({ day })}
          onOpen={(event) => setEventSheet({ event })}
        />

        <section className="card">
          <h2>Organisations{shownCity ? ` in ${shownCity}` : ''}</h2>
          <p className="muted">Tap an organisation to see what it is running and ask to join a project. They can hide projects they do not want shown.</p>
          <div className="field mt">
            <label htmlFor="area-search">Search organisations</label>
            <input id="area-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or suburb…" autoComplete="off" />
          </div>
          {orgs.isPending && <CardSkeletons count={2} height={70} />}
          {orgs.isError && <p className="message error">{orgs.error.message || 'Could not load the area.'}</p>}
          {orgs.isSuccess && list.length === 0 && (
            <Empty title={orgs.data.length === 0 ? 'No other organisations here yet' : 'No match'}>
              {orgs.data.length === 0
                ? 'Other organisations appear once they have registered with an address in this city.'
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
