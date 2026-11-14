import { useQuery } from '@tanstack/react-query'
import {
  getProjects, getProjectInvitations, getProject, getBeneficiaries, getProjectParticipants, getPartnerships,
  getStockItems, getReceipts, getHandouts, getReceived, getProjectJoinRequests, getProjectEvents,
} from '../lib/api.js'

export const projectKeys = {
  list: (orgId) => ['projects', orgId],
  invitations: (orgId) => ['project-invitations', orgId],
  one: (id) => ['project', id],
  beneficiaries: (id) => ['beneficiaries', id],
  participants: (id) => ['participants', id],
  stock: (id) => ['stock-items', id],
  receipts: (id) => ['receipts', id],
  handouts: (id) => ['handouts', id],
  received: (personId) => ['received', personId],
  joinRequests: (orgId) => ['project-join-requests', orgId],
  events: (id) => ['project-events', id],
}

export const useProjects = (orgId) =>
  useQuery({ queryKey: projectKeys.list(orgId), queryFn: () => getProjects(orgId), enabled: !!orgId })

/** Projects other organisations have invited this organisation to work on. */
export const useProjectInvitations = (orgId) =>
  useQuery({ queryKey: projectKeys.invitations(orgId), queryFn: () => getProjectInvitations(orgId), enabled: !!orgId })

/** Requests other organisations made to join the projects we own. */
export const useProjectJoinRequests = (orgId) =>
  useQuery({ queryKey: projectKeys.joinRequests(orgId), queryFn: () => getProjectJoinRequests(orgId), enabled: !!orgId })

/** A project's own dated events. */
export const useProjectEvents = (id) =>
  useQuery({ queryKey: projectKeys.events(id), queryFn: () => getProjectEvents(id), enabled: !!id })

export const useProject = (id) => useQuery({ queryKey: projectKeys.one(id), queryFn: () => getProject(id), enabled: !!id })

export const useBeneficiaries = (id) =>
  useQuery({ queryKey: projectKeys.beneficiaries(id), queryFn: () => getBeneficiaries(id), enabled: !!id })

export const useParticipants = (id) =>
  useQuery({ queryKey: projectKeys.participants(id), queryFn: () => getProjectParticipants(id), enabled: !!id })

export const useStockItems = (id) =>
  useQuery({ queryKey: projectKeys.stock(id), queryFn: () => getStockItems(id), enabled: !!id })

export const useReceipts = (id, enabled = true) =>
  useQuery({ queryKey: projectKeys.receipts(id), queryFn: () => getReceipts(id), enabled: !!id && enabled })

/** { entries, hiddenCount } */
export const useHandouts = (id) =>
  useQuery({ queryKey: projectKeys.handouts(id), queryFn: () => getHandouts(id), enabled: !!id })

/** What a person has received through projects. */
export const useReceived = (personId) =>
  useQuery({ queryKey: projectKeys.received(personId), queryFn: () => getReceived(personId), enabled: !!personId, gcTime: 0 })

export const usePartnerships = (orgId, enabled = true) =>
  useQuery({ queryKey: ['partnerships', orgId], queryFn: () => getPartnerships(orgId), enabled: !!orgId && enabled })
