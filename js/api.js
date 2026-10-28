//js/api.js
import { getStoredUser } from './utils.js';

if (!window.VOUCHR_CONFIG) {
  throw new Error('VOUCHR_CONFIG is missing. Load js/config.js before any module scripts.');
}

const API_BASE_URL = window.VOUCHR_CONFIG.apiBaseUrl;

async function request(endpoint, options = {}) {
  // Prefer an explicitly passed token (used during registration),
  // otherwise fall back to the stored session token.
  const explicitToken = options.token;
  const { authToken } = getStoredUser() || {};
  const token = explicitToken || authToken;
  

  const { token: _, ...fetchOptions } = options; // don't pass "token" to fetch

  const config = {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions.headers
    }
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || response.statusText || "Request failed");
  }

  return data;
}

// Auth / Users
export async function registerStaff(payload, token) {
  return request("/api/users/staff", {
    method: "POST",
    body: JSON.stringify(payload),
    token                               // ← pass the fresh JWT
  });
}

export async function registerRecipient(payload, token) {
  return request("/api/users/recipient", {
    method: "POST",
    body: JSON.stringify(payload),
    token                               // ← pass the fresh JWT
  });
}

// ... rest of the file stays the same
export async function getRecipientVouchers(recipientId) {
  return request(`/api/vouchers/recipient/${recipientId}`);
}

export async function createOrganization(payload) {
  return request("/api/organization", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function addStaff(payload) {
  return request("/api/organization/add-staff", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createHub(payload, token) {
  return request("/api/hub/create-hub", {
    method: "POST",
    body: JSON.stringify(payload),
    token
  });
}

// Projects (token = fresh Supabase access token, see session.js getAuthToken)
export async function getProjects(orgId, token) {
  return request(`/api/organizations/${orgId}/projects`, { token });
}

export async function createProject(orgId, payload, token) {
  return request(`/api/organizations/${orgId}/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
    token
  });
}

export async function getProject(projectId, token) {
  return request(`/api/projects/${projectId}`, { token });
}

export async function updateProject(projectId, payload, token) {
  return request(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    token
  });
}

export async function getBeneficiaries(projectId, token) {
  return request(`/api/projects/${projectId}/beneficiaries`, { token });
}

export async function addBeneficiary(projectId, payload, token) {
  return request(`/api/projects/${projectId}/beneficiaries`, {
    method: "POST",
    body: JSON.stringify(payload),
    token
  });
}

// Hubs
export async function getHub(hubId, token) {
  return request(`/api/hub/${hubId}`, { token });
}

export async function getHubProjects(hubId, token) {
  return request(`/api/hub/${hubId}/projects`, { token });
}

export async function searchHubOrgs(query, token) {
  return request(`/api/hub/search-orgs?q=${encodeURIComponent(query)}`, { token });
}

export async function addOrgToHub(hubId, organizationId, token) {
  return request(`/api/hub/${hubId}/add-org`, {
    method: "POST",
    body: JSON.stringify({ organizationId }),
    token
  });
}

export async function leaveHub(hubId, organizationId, token) {
  return request(`/api/hub/${hubId}/organizations/${organizationId}`, {
    method: "DELETE",
    token
  });
}

// People & consent
export async function getPeople(orgId, token) {
  return request(`/api/organizations/${orgId}/people`, { token });
}

export async function getConsentForm(orgId, token) {
  return request(`/api/organizations/${orgId}/consent-form`, { token });
}

export async function signConsent(orgId, payload, token) {
  return request(`/api/organizations/${orgId}/consents`, {
    method: "POST",
    body: JSON.stringify(payload),
    token
  });
}

export async function withdrawConsent(consentId, reason, token) {
  return request(`/api/consents/${consentId}/withdraw`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || null }),
    token
  });
}

// The sealed PDF is binary, so it bypasses request() and returns a Blob.
export async function fetchConsentPdf(consentId, token) {
  const response = await fetch(`${API_BASE_URL}/api/consents/${consentId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || data.error || "Could not load the signed copy");
  }
  return response.blob();
}

// Platform settings (platform admins only)
export async function getPlatformMe(token) {
  return request("/api/platform/me", { token });
}

export async function getOperatorHistory(token) {
  return request("/api/platform/operator-details/history", { token });
}

export async function saveOperatorDetails(payload, token) {
  return request("/api/platform/operator-details", {
    method: "PUT",
    body: JSON.stringify(payload),
    token
  });
}
