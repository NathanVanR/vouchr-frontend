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
    throw new Error(data.error || data.message || response.statusText || "Request failed");
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