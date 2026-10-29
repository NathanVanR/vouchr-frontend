//js/utils.js
import { demoUserOrganizations } from './demo-data.js';

/** Demo mode (set by demo.html): dummy data, no auth, no network. Per tab, so a real login is never touched. */
export function isDemo() {
  try { return sessionStorage.getItem("vouchrDemo") === "1"; } catch { return false; }
}

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
  if (isDemo()) {
    return {
      userId: "demo-user",
      authUserId: "demo-user",
      authToken: "demo-token",
      userRole: "STAFF",
      activeOrgId: localStorage.getItem("activeOrgId"),
      userOrganizations: demoUserOrganizations()
    };
  }
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
  if (isDemo()) {
    exitDemo();
    return;
  }
  // localStorage.removeItem("user");
  // localStorage.removeItem("activeOrgId");
  // localStorage.removeItem("accessToken"); 
  
  // Alternatively, use localStorage.clear() if you want to wipe absolutely everything
  localStorage.clear();

  // Redirect back to the home or login page
  window.location.href = "index.html"; // Adjust to your actual login/home page URL
}

/** Leaves demo mode without touching the real localStorage session, and returns to the home page. */
export function exitDemo() {
  try {
    sessionStorage.removeItem("vouchrDemo");
    sessionStorage.removeItem("vouchrDemoState");
  } catch { /* nothing to clear */ }
  window.location.href = "index.html";
}

// Demo banner on every page, and the screens that need a real account are switched off
document.addEventListener("DOMContentLoaded", () => {
  if (!isDemo()) return;

  const banner = document.createElement("div");
  banner.className = "demo-banner";
  banner.innerHTML = `<span><strong>Demo mode</strong> · sample data only, nothing is saved.</span>
    <button type="button" class="demo-banner-exit">Exit demo</button>`;
  banner.querySelector("button").addEventListener("click", exitDemo);
  document.body.prepend(banner);

  document.querySelectorAll('a[href="register-org.html"]').forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Creating an organisation is not available in the demo.");
    });
  });
});

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

// Phone header menu: toggles #nav-menu from #nav-menu-btn on any page that has them
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("nav-menu-btn");
  const menu = document.getElementById("nav-menu");
  if (!btn || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(!menu.classList.contains("open"));
  });
  menu.addEventListener("click", () => setOpen(false));
  document.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
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

// ---- South African ID numbers and ages (same rules as the backend: util/SaIdNumber.java, Person.java) ----
export const AGE_OF_MAJORITY = 18;

export function isValidSaId(id) {
  if (!/^\d{13}$/.test(id || "")) return false;
  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  const realDate = (year) => {
    const d = new Date(Date.UTC(year, mm - 1, dd));
    return d.getUTCFullYear() === year && d.getUTCMonth() === mm - 1 && d.getUTCDate() === dd;
  };
  if (!realDate(1900 + yy) && !realDate(2000 + yy)) return false;
  if (id[10] !== "0" && id[10] !== "1") return false; // citizen / permanent resident

  let sum = 0;
  let double = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let d = Number(id[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** YYYY-MM-DD from a valid SA ID; the century is the latest one that is not in the future. Staff can correct it. */
export function dateOfBirthFromSaId(id) {
  if (!isValidSaId(id)) return null;
  const yy = Number(id.slice(0, 2));
  const year = 2000 + yy <= new Date().getFullYear() ? 2000 + yy : 1900 + yy;
  return `${year}-${id.slice(2, 4)}-${id.slice(4, 6)}`;
}

/** The YYMMDD part of the ID must match the date of birth (the century is not compared). */
export function dateOfBirthMatchesId(dob, id) {
  return !!dob && !!id && dob.slice(2, 4) === id.slice(0, 2) && dob.slice(5, 7) === id.slice(2, 4)
    && dob.slice(8, 10) === id.slice(4, 6);
}

/** Whole years between a YYYY-MM-DD date of birth and today. */
export function ageOn(dob, today = new Date()) {
  const [y, m, d] = dob.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

