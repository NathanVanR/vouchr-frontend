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
/** Makes the profile's email follow the confirmed address on the sign-in token (after an email change). */
export const syncMyEmail = () => post('/api/users/me/email-sync')
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

// What a project collects (receipts) and gives out (handouts), plus the optional stock items it keeps counts for
export const getStockItems = (projectId) => get(`/api/projects/${projectId}/stock-items`)
export const addStockItem = (projectId, payload) => post(`/api/projects/${projectId}/stock-items`, payload)
export const updateStockItem = (stockItemId, payload) => patch(`/api/stock-items/${stockItemId}`, payload)
export const getReceipts = (projectId) => get(`/api/projects/${projectId}/receipts`)
export const addReceipt = (projectId, payload) => post(`/api/projects/${projectId}/receipts`, payload)
export const deleteReceipt = (receiptId) => del(`/api/receipts/${receiptId}`)
export const getHandouts = (projectId) => get(`/api/projects/${projectId}/handouts`)
export const addHandout = (projectId, payload) => post(`/api/projects/${projectId}/handouts`, payload)
export const deleteHandout = (handoutId) => del(`/api/handouts/${handoutId}`)
/** What a person has received through projects (their own organisation's staff only). */
export const getReceived = (personId) => get(`/api/people/${personId}/received`)

// Other organisations working on a project (invited by the owner's admin, accepted by theirs)
export const getProjectParticipants = (projectId) => get(`/api/projects/${projectId}/participants`)
export const inviteProjectParticipant = (projectId, organizationId) =>
  post(`/api/projects/${projectId}/participants`, { organizationId })
export const getProjectInvitations = (orgId) => get(`/api/organizations/${orgId}/project-invitations`)
/** action: "accept" | "decline" | "end" */
export const answerProjectParticipant = (participantId, action) =>
  post(`/api/project-participants/${participantId}/${action}`)


// ---- Area: organisations in the same city, their projects and a shared calendar ----
/** { cities, defaultCity } */
export const getAreaCities = (forOrgId) => get(`/api/area/cities?forOrgId=${forOrgId}`)
/** place: null (our own city) | { city, suburb } | { all: true } */
const placeParams = (place) => {
  if (!place) return ''
  if (place.all) return '&all=true'
  return `${place.city ? `&city=${encodeURIComponent(place.city)}` : ''}${place.suburb ? `&suburb=${encodeURIComponent(place.suburb)}` : ''}`
}
export const getAreaOrganizations = (forOrgId, place) => get(`/api/area/organizations?forOrgId=${forOrgId}${placeParams(place)}`)
/** Cities and suburbs that have organisations, matching q (2+ characters); with no q the cities. */
export const getAreaPlaces = (forOrgId, q) => get(`/api/area/places?forOrgId=${forOrgId}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
export const getAreaOrgProjects = (orgId, forOrgId) => get(`/api/area/organizations/${orgId}/projects?forOrgId=${forOrgId}`)
export const getAreaEvents = (forOrgId, place, from, to) => get(`/api/area/events?forOrgId=${forOrgId}&from=${from}&to=${to}${placeParams(place)}`)
export const getAreaClashes = (forOrgId, startsOn, endsOn, type) =>
  get(`/api/area/events/clashes?forOrgId=${forOrgId}&startsOn=${startsOn}&type=${type}${endsOn ? `&endsOn=${endsOn}` : ''}`)
/** A project's own dated events (its page). */
export const getProjectEvents = (projectId) => get(`/api/projects/${projectId}/events`)
export const createAreaEvent = (orgId, payload) => post(`/api/organizations/${orgId}/events`, payload)
export const updateAreaEvent = (eventId, payload) => put(`/api/events/${eventId}`, payload)
export const deleteAreaEvent = (eventId) => del(`/api/events/${eventId}`)
/** Ask to take part in a project we do not own (the owner's admin answers). */
export const requestToJoinProject = (projectId, organizationId) => post(`/api/projects/${projectId}/join-requests`, { organizationId })
export const getProjectJoinRequests = (orgId) => get(`/api/organizations/${orgId}/project-join-requests`)

// ---- Asking a partner to complete a partly filled profile (the person stays with the requesting organisation) ----
export const createProfileRequest = (personId, payload) => post(`/api/people/${personId}/profile-requests`, payload)
export const getPersonProfileRequests = (personId) => get(`/api/people/${personId}/profile-requests`)
/** direction: "incoming" (open requests partners made of us) | "outgoing" */
export const getOrgProfileRequests = (orgId, direction) => get(`/api/organizations/${orgId}/profile-requests?direction=${direction}`)
export const completeProfileRequest = (requestId, payload) => post(`/api/profile-requests/${requestId}/complete`, payload)
export const cancelProfileRequest = (requestId) => post(`/api/profile-requests/${requestId}/cancel`)

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
/** Every check-in and status change on a person's (and their family's) care plan items, newest first. */
export const getCareHistory = (personId) => get(`/api/people/${personId}/care-history`)
export const getCareItemEvents = (itemId) => get(`/api/care-plan-items/${itemId}/events`)
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
