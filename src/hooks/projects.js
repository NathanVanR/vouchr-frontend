import { useQuery } from '@tanstack/react-query'
import {
  getProjects, getProjectInvitations, getProject, getBeneficiaries, getProjectParticipants, getProjectSessions,
  getAidSession, getPartnerships,
} from '../lib/api.js'

export const projectKeys = {
  list: (orgId) => ['projects', orgId],
  invitations: (orgId) => ['project-invitations', orgId],
  one: (id) => ['project', id],
  beneficiaries: (id) => ['beneficiaries', id],
  participants: (id) => ['participants', id],
  sessions: (id) => ['sessions', id],
  session: (id) => ['session', id],
}

export const useProjects = (orgId) =>
  useQuery({ queryKey: projectKeys.list(orgId), queryFn: () => getProjects(orgId), enabled: !!orgId })

/** Projects other organisations have invited this organisation to work on. */
export const useProjectInvitations = (orgId) =>
  useQuery({ queryKey: projectKeys.invitations(orgId), queryFn: () => getProjectInvitations(orgId), enabled: !!orgId })

export const useProject = (id) => useQuery({ queryKey: projectKeys.one(id), queryFn: () => getProject(id), enabled: !!id })

export const useBeneficiaries = (id) =>
  useQuery({ queryKey: projectKeys.beneficiaries(id), queryFn: () => getBeneficiaries(id), enabled: !!id })

export const useParticipants = (id) =>
  useQuery({ queryKey: projectKeys.participants(id), queryFn: () => getProjectParticipants(id), enabled: !!id })

export const useSessions = (id, enabled = true) =>
  useQuery({ queryKey: projectKeys.sessions(id), queryFn: () => getProjectSessions(id), enabled: !!id && enabled })

export const useAidSession = (id) =>
  useQuery({ queryKey: projectKeys.session(id), queryFn: () => getAidSession(id), enabled: !!id })

export const usePartnerships = (orgId, enabled = true) =>
  useQuery({ queryKey: ['partnerships', orgId], queryFn: () => getPartnerships(orgId), enabled: !!orgId && enabled })
