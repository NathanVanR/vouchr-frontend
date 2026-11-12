// All calls to the Vouchr API. request() attaches the Supabase access token itself, so callers never pass tokens
// (registerStaff is the one exception: it runs before the session is stored, so it takes the fresh token).
import { config } from '../config.js'
import { getAccessToken } from './supabase.js'
import { isDemo } from './demo.js'
// the sample-data backend is only downloaded when demo mode is running
const loadDemo = () => import('./demo-data.js')

const API_BASE_URL = config.apiBaseUrl

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(endpoint, { method = 'GET', body, token } = {}) {
  const options = { method, body: body === undefined ? undefined : JSON.stringify(body) }
  if (isDemo()) return (await loadDemo()).demoRequest(endpoint, options)

  const bearer = token || (await getAccessToken())
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    body: options.body,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer && { Authorization: `Bearer ${bearer}` }),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(data.message || data.error || response.statusText || 'Request failed', response.status)
  }
  return data
}

const get = (url) => request(url)
const post = (url, body) => request(url, { method: 'POST', body })
const patch = (url, body) => request(url, { method: 'PATCH', body })
const put = (url, body) => request(url, { method: 'PUT', body })
const del = (url) => request(url, { method: 'DELETE' })

// ---- Auth / users / organisations ----
export const getMe = () => get('/api/users/me')
export const registerStaff = (payload, token) => request('/api/users/staff', { method: 'POST', body: payload, token })
export const createOrganization = (payload) => post('/api/organization', payload)
export const addStaff = (payload) => post('/api/organization/add-staff', payload)
export const searchOrgs = (q, excludeOrgId) =>
  get(`/api/organizations/search?q=${encodeURIComponent(q)}${excludeOrgId ? `&excludeOrgId=${encodeURIComponent(excludeOrgId)}` : ''}`)

// ---- Projects ----
export const getProjects = (orgId) => get(`/api/organizations/${orgId}/projects`)
export const createProject = (orgId, payload) => post(`/api/organizations/${orgId}/projects`, payload)
export const getProject = (projectId) => get(`/api/projects/${projectId}`)
export const updateProject = (projectId, payload) => patch(`/api/projects/${projectId}`, payload)
export const getBeneficiaries = (projectId) => get(`/api/projects/${projectId}/beneficiaries`)
export const addBeneficiary = (projectId, payload) => post(`/api/projects/${projectId}/beneficiaries`, payload)

// Other organisations working on a project (invited by the owner's admin, accepted by theirs)
export const getProjectParticipants = (projectId) => get(`/api/projects/${projectId}/participants`)
export const inviteProjectParticipant = (projectId, organizationId) =>
  post(`/api/projects/${projectId}/participants`, { organizationId })
export const getProjectInvitations = (orgId) => get(`/api/organizations/${orgId}/project-invitations`)
/** action: "accept" | "decline" | "end" */
export const answerProjectParticipant = (participantId, action) =>
  post(`/api/project-participants/${participantId}/${action}`)

// ---- Giving aid: sessions (e.g. a weekly soup run) and the people who received aid in each ----
export const getProjectSessions = (projectId) => get(`/api/projects/${projectId}/sessions`)
export const openProjectSession = (projectId, payload) => post(`/api/projects/${projectId}/sessions`, payload)
export const getAidSession = (sessionId) => get(`/api/sessions/${sessionId}`)
export const giveAid = (sessionId, payload) => post(`/api/sessions/${sessionId}/handovers`, payload)
export const undoAid = (handoverId) => del(`/api/handovers/${handoverId}`)

// ---- People & consent ----
export const getPeople = (orgId) => get(`/api/organizations/${orgId}/people`)
export const createPerson = (orgId, payload) => post(`/api/organizations/${orgId}/people`, payload)
export const getPerson = (personId) => get(`/api/people/${personId}`)
export const updatePerson = (personId, payload) => patch(`/api/people/${personId}`, payload)
export const getConsentForm = (orgId) => get(`/api/organizations/${orgId}/consent-form`)
export const signConsent = (orgId, payload) => post(`/api/organizations/${orgId}/consents`, payload)
export const withdrawConsent = (consentId, reason) =>
  post(`/api/consents/${consentId}/withdraw`, { reason: reason || null })

/** The sealed PDF is binary, so it bypasses request() and returns a Blob. */
export async function fetchConsentPdf(consentId) {
  if (isDemo()) return (await loadDemo()).demoConsentPdf()
  const response = await fetch(`${API_BASE_URL}/api/consents/${consentId}/pdf`, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(data.message || data.error || 'Could not load the signed copy', response.status)
  }
  return response.blob()
}

// ---- Families & referrals ----
export const getFamilies = (orgId) => get(`/api/organizations/${orgId}/families`)
export const createFamily = (orgId, payload) => post(`/api/organizations/${orgId}/families`, payload)
export const getFamily = (familyId) => get(`/api/families/${familyId}`)
export const updateFamily = (familyId, payload) => patch(`/api/families/${familyId}`, payload)
export const changeFamilyMembers = (familyId, payload) => post(`/api/families/${familyId}/members`, payload)
export const referFamily = (familyId, payload) => post(`/api/families/${familyId}/referrals`, payload)
/** direction: "incoming" | "outgoing" */
export const getReferrals = (orgId, direction) => get(`/api/organizations/${orgId}/referrals?direction=${direction}`)
/** action: "accept" | "decline" | "close" */
export const answerReferral = (referralId, action) => post(`/api/referrals/${referralId}/${action}`)

// ---- Partnerships: organisations agreed (by their admins) to work together; services each one offers ----
export const getOrgServices = (orgId) => get(`/api/organizations/${orgId}/services`)
export const setOrgServices = (orgId, services) => put(`/api/organizations/${orgId}/services`, { services })
export const getPartnerships = (orgId) => get(`/api/organizations/${orgId}/partnerships`)
export const proposePartnership = (orgId, partnerOrganizationId) =>
  post(`/api/organizations/${orgId}/partnerships`, { partnerOrganizationId })
/** action: "accept" | "decline" | "end" */
export const answerPartnership = (partnershipId, action) => post(`/api/partnerships/${partnershipId}/${action}`)

// ---- Care plan: services a family or person gets, from the requesting organisation or from a partner ----
export const getFamilyCarePlan = (familyId) => get(`/api/families/${familyId}/care-plan`)
export const addFamilyCarePlanItem = (familyId, payload) => post(`/api/families/${familyId}/care-plan`, payload)
export const getPersonCarePlan = (personId) => get(`/api/people/${personId}/care-plan`)
export const addPersonCarePlanItem = (personId, payload) => post(`/api/people/${personId}/care-plan`, payload)
/** direction: "incoming" (we provide: a name search, q needs 2+ characters) | "outgoing" (we asked others) */
export const getCarePlanItems = (orgId, direction, q = '') =>
  get(`/api/organizations/${orgId}/care-plan-items?direction=${direction}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
export const checkInCarePlanItem = (itemId) => post(`/api/care-plan-items/${itemId}/check-in`)
export const updateCarePlanStatus = (itemId, status, note) =>
  post(`/api/care-plan-items/${itemId}/status`, { status, note: note || null })

// ---- Platform settings (platform admins only) ----
export const getPlatformMe = () => get('/api/platform/me')
export const getOperatorHistory = () => get('/api/platform/operator-details/history')
export const saveOperatorDetails = (payload) => put('/api/platform/operator-details', payload)
