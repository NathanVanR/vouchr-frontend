export function formatCurrency(amount) {
  return `R ${(amount || 0).toLocaleString("en-ZA")}`;
}

export function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function getStoredUser() {
  return {
    userId: localStorage.getItem("userId"),
    authUserId: localStorage.getItem("authUserId"),
    authToken: localStorage.getItem("authToken"),
    userRole: localStorage.getItem("userRole"),
    activeOrgId: localStorage.getItem("activeOrgId"),
    userOrganizations: JSON.parse(localStorage.getItem("userOrganizations") || "{}")
  };
}

export function saveUserSession({ userId, authUserId, token, role, organizations }) {
  if (userId) localStorage.setItem("userId", userId);
  if (authUserId) localStorage.setItem("authUserId", authUserId);
  if (token) localStorage.setItem("authToken", token);
  if (role) localStorage.setItem("userRole", role);
  if (organizations) localStorage.setItem("userOrganizations", JSON.stringify(organizations));
}

export function clearUserSession() {
  localStorage.removeItem("userId");
  localStorage.removeItem("authUserId");
  localStorage.removeItem("authToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("activeOrgId");
  localStorage.removeItem("userOrganizations");
}