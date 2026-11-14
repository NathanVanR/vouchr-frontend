import { useQuery } from '@tanstack/react-query'
import { getConsentForm, getOrgProfileRequests, getPeople, getPerson, getPersonProfileRequests } from '../lib/api.js'

export const peopleKey = (orgId) => ['people', orgId]

/** Everyone the organisation's staff have added (the list is searched in the browser). */
export const usePeople = (orgId) =>
  useQuery({ queryKey: peopleKey(orgId), queryFn: () => getPeople(orgId), enabled: !!orgId })

export const useConsentForm = (orgId, enabled = true) =>
  useQuery({ queryKey: ['consent-form', orgId], queryFn: () => getConsentForm(orgId), enabled: !!orgId && enabled, staleTime: 5 * 60_000 })

export const usePerson = (personId) =>
  useQuery({ queryKey: ['person', personId], queryFn: () => getPerson(personId), enabled: !!personId, gcTime: 0 })

/** Requests to partners to complete this person's profile (their own organisation's staff). */
export const usePersonProfileRequests = (personId) =>
  useQuery({ queryKey: ['profile-requests', personId], queryFn: () => getPersonProfileRequests(personId), enabled: !!personId, gcTime: 0 })

/** direction "incoming": open requests partners made of us. */
export const useOrgProfileRequests = (orgId, direction) =>
  useQuery({ queryKey: ['profile-requests-org', orgId, direction], queryFn: () => getOrgProfileRequests(orgId, direction), enabled: !!orgId })
