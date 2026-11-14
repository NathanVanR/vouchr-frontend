import { useQuery } from '@tanstack/react-query'
import { getAreaCities, getAreaEvents, getAreaOrganizations, getAreaOrgProjects, getAreaClashes } from '../lib/api.js'

export const areaKeys = {
  cities: (orgId) => ['area-cities', orgId],
  organizations: (orgId, city) => ['area-organizations', orgId, city],
  projects: (orgId) => ['area-projects', orgId],
  events: (orgId, city, from, to) => ['area-events', orgId, city, from, to],
}

/** { cities, defaultCity } */
export const useAreaCities = (orgId) =>
  useQuery({ queryKey: areaKeys.cities(orgId), queryFn: () => getAreaCities(orgId), enabled: !!orgId, staleTime: 5 * 60_000 })

/** city null = the organisation's own. */
export const useAreaOrganizations = (orgId, city) =>
  useQuery({ queryKey: areaKeys.organizations(orgId, city), queryFn: () => getAreaOrganizations(orgId, city), enabled: !!orgId })

export const useAreaOrgProjects = (areaOrgId, forOrgId) =>
  useQuery({ queryKey: [...areaKeys.projects(areaOrgId), forOrgId], queryFn: () => getAreaOrgProjects(areaOrgId, forOrgId), enabled: !!areaOrgId && !!forOrgId, gcTime: 0 })

export const useAreaEvents = (orgId, city, from, to) =>
  useQuery({ queryKey: areaKeys.events(orgId, city, from, to), queryFn: () => getAreaEvents(orgId, city, from, to), enabled: !!orgId && !!from && !!to })

/** Other organisations' fundraisers overlapping these dates (only asked for fundraisers). */
export const useAreaClashes = (orgId, startsOn, endsOn, type) =>
  useQuery({
    queryKey: ['area-clashes', orgId, startsOn, endsOn, type],
    queryFn: () => getAreaClashes(orgId, startsOn, endsOn, type),
    enabled: !!orgId && !!startsOn && type === 'FUNDRAISER',
  })
