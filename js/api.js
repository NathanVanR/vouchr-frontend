import { API_BASE_URL } from './config.js';
import { getStoredUser } from './utils.js';

async function request(endpoint, options = {}) {
  const { authToken } = getStoredUser();

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers
    },
    ...options
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || response.statusText || "Request failed");
  }

  return data;
}

// Auth / Users
export async function registerStaff(payload) {
  return request("/api/users/staff", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function registerRecipient(payload) {
  return request("/api/users/recipient", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Vouchers
export async function getRecipientVouchers(recipientId) {
  return request(`/api/vouchers/recipient/${recipientId}`);
}

// Organizations (future)
export async function createOrganization(payload) {
  return request("/api/organizations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}