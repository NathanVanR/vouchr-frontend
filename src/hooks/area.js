import { useQuery } from '@tanstack/react-query'
import { getAreaCities, getAreaClashes, getAreaEvents, getAreaOrganizations, getAreaOrgProjects, getAreaPlaces } from '../lib/api.js'

export const areaKeys = {
  cities: (orgId) => ['area-cities', orgId],
  organizations: (orgId, place) => ['area-organizations', orgId, place],
  projects: (orgId) => ['area-projects', orgId],
  events: (orgId, place, from, to) => ['area-events', orgId, place, from, to],
}

/** { cities, defaultCity } */
export const useAreaCities = (orgId) =>
  useQuery({ queryKey: areaKeys.cities(orgId), queryFn: () => getAreaCities(orgId), enabled: !!orgId, staleTime: 5 * 60_000 })

/** place null = the organisation's own city; { city, suburb } or { all: true } to look elsewhere. */
export const useAreaOrganizations = (orgId, place) =>
  useQuery({ queryKey: areaKeys.organizations(orgId, place), queryFn: () => getAreaOrganizations(orgId, place), enabled: !!orgId })

/** Cities and suburbs with organisations matching q (2+ characters); with no q, the cities. */
export const useAreaPlaces = (orgId, q, enabled = true) =>
  useQuery({
    queryKey: ['area-places', orgId, q.length >= 2 ? q : ''],
    queryFn: () => getAreaPlaces(orgId, q.length >= 2 ? q : ''),
    enabled: !!orgId && enabled,
    staleTime: 60_000,
  })

export const useAreaOrgProjects = (areaOrgId, forOrgId) =>
  useQuery({ queryKey: [...areaKeys.projects(areaOrgId), forOrgId], queryFn: () => getAreaOrgProjects(areaOrgId, forOrgId), enabled: !!areaOrgId && !!forOrgId, gcTime: 0 })

export const useAreaEvents = (orgId, place, from, to) =>
  useQuery({ queryKey: areaKeys.events(orgId, place, from, to), queryFn: () => getAreaEvents(orgId, place, from, to), enabled: !!orgId && !!from && !!to })

/** Other organisations' fundraisers overlapping these dates (only asked for fundraisers). */
export const useAreaClashes = (orgId, startsOn, endsOn, type) =>
  useQuery({
    queryKey: ['area-clashes', orgId, startsOn, endsOn, type],
    queryFn: () => getAreaClashes(orgId, startsOn, endsOn, type),
    enabled: !!orgId && !!startsOn && type === 'FUNDRAISER',
  })
