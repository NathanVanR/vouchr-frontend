//js/utils.js
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

export function performLogout() {
  // localStorage.removeItem("user");
  // localStorage.removeItem("activeOrgId");
  // localStorage.removeItem("accessToken"); 
  
  // Alternatively, use localStorage.clear() if you want to wipe absolutely everything
  localStorage.clear();

  // Redirect back to the home or login page
  window.location.href = "index.html"; // Adjust to your actual login/home page URL
}

// Automatically attach the logout event to any button with the ID "logout-btn"
document.addEventListener("DOMContentLoaded", () => {
  // Use querySelectorAll in case you ever use a class like .logout-btn for multiple buttons on one page
  const logoutButtons = document.querySelectorAll("#logout-btn, .logout-btn");
  
  logoutButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      performLogout();
    });
  });
});

// ---- Street address: one field with a number and a name, e.g. "12 Mandela Way" ----
// Same rule as the backend (util/StreetAddress.java).
export const STREET_ADDRESS_MESSAGE =
  "Enter both a street number and a street name, for example 12 Mandela Way";

export function normaliseStreetAddress(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function isValidStreetAddress(value) {
  const normalised = normaliseStreetAddress(value);
  if (!normalised || normalised.length > 255) return false;
  if (!/^[\p{L}\p{N} .,'\u2019/#&()\-]+$/u.test(normalised)) return false;

  let hasNumber = false;
  let hasName = false;
  for (const raw of normalised.split(" ")) {
    const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (/\p{Nd}/u.test(word)) {
      hasNumber = true;
    } else if (/^\p{L}[\p{L}'\u2019\-]*\p{L}$/u.test(word)) {
      hasName = true;
    }
  }
  return hasNumber && hasName;
}

/** Keeps the browser's own form validation in step with the rule, so an invalid address blocks submit. */
export function attachStreetAddressValidation(input) {
  if (!input) return;
  const check = () => {
    input.setCustomValidity(
      input.value.trim() && !isValidStreetAddress(input.value) ? STREET_ADDRESS_MESSAGE : ""
    );
  };
  input.addEventListener("input", check);
  input.addEventListener("blur", check);
  check();
}

