import { useQuery } from '@tanstack/react-query'
import {
  getCarePlanItems, getFamilies, getFamily, getFamilyCarePlan, getOrgServices, getPartnerships, getPersonCarePlan, getReferrals,
} from '../lib/api.js'

export const familyKeys = {
  list: (orgId) => ['families', orgId],
  one: (id) => ['family', id],
  referrals: (orgId, direction) => ['referrals', orgId, direction],
}

export const useFamilies = (orgId) =>
  useQuery({ queryKey: familyKeys.list(orgId), queryFn: () => getFamilies(orgId), enabled: !!orgId })

export const useFamily = (id, enabled = true) =>
  useQuery({ queryKey: familyKeys.one(id), queryFn: () => getFamily(id), enabled: !!id && enabled })

export const useReferrals = (orgId, direction) =>
  useQuery({ queryKey: familyKeys.referrals(orgId, direction), queryFn: () => getReferrals(orgId, direction), enabled: !!orgId })

export const carePlanKey = (kind, id) => ['care-plan', kind, id]

export const useCarePlan = (kind, id, enabled = true) =>
  useQuery({
    queryKey: carePlanKey(kind, id),
    queryFn: () => (kind === 'family' ? getFamilyCarePlan(id) : getPersonCarePlan(id)),
    enabled: !!id && enabled,
    gcTime: 0,
  })

export const useOrgServices = (orgId) =>
  useQuery({ queryKey: ['org-services', orgId], queryFn: () => getOrgServices(orgId), enabled: !!orgId })

export const partnershipsKey = (orgId) => ['partnerships', orgId]
export const usePartnershipList = (orgId) =>
  useQuery({ queryKey: partnershipsKey(orgId), queryFn: () => getPartnerships(orgId), enabled: !!orgId })

/** direction "incoming" is a name search (q needs 2+ characters); "outgoing" is what we asked others for. */
export const useCareItems = (orgId, direction, q, enabled = true) =>
  useQuery({
    queryKey: ['care-plan-items', orgId, direction, q],
    queryFn: () => getCarePlanItems(orgId, direction, q),
    enabled: !!orgId && enabled,
  })
