import { getStoredUser } from './utils.js';

function getSupabaseClient() {
  // Already created?
  if (window._supabaseClient) return window._supabaseClient;

  const cfg = window.VOUCHR_CONFIG?.supabase;
  if (!cfg?.url || !cfg?.anonKey) {
    console.error('VOUCHR_CONFIG.supabase is missing – check config.js');
    return null;
  }

  // CDN exposes a global called "supabase"
  if (typeof supabase === 'undefined') {
    console.error('Supabase JS library not found. Add the CDN script BEFORE this file.');
    return null;
  }

  // Correct way for the UMD / CDN build
  const { createClient } = supabase;
  if (typeof createClient !== 'function') {
    console.error('supabase.createClient is not available');
    return null;
  }

  try {
    window._supabaseClient = createClient(cfg.url, cfg.anonKey);
    console.log('Supabase client created successfully');
    return window._supabaseClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

async function initEmployeePortal() {
  const portalContent = document.getElementById("org-portal-content");
  if (!portalContent) return;

  const unattachedBanner = document.getElementById("unattached-staff-banner");
  const orgSwitcherContainer = document.getElementById("org-switcher-container");
  const activeOrgSelect = document.getElementById("active-org-select");
  const userRoleDisplay = document.getElementById("user-role-display");
  const navManageStaff = document.getElementById("nav-manage-staff");
  const orgEyebrow = document.getElementById("org-eyebrow");
  const voucherTypeSelect = document.getElementById("voucher-type");
  const customAmountGroup = document.getElementById("custom-amount-group");
  const voucherAmountInput = document.getElementById("voucher-amount");

  const user = getStoredUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  let userOrganizations = user.userOrganizations || {};

  // Fetch fresh user context
  try {
    const supabaseClient = getSupabaseClient();

    if (!supabaseClient) {
      console.warn('Supabase client unavailable – using stored user data only');
    } else {
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error('getSession error:', sessionError);
      }

      const token = session?.access_token;

      if (!token) {
        console.warn('No active Supabase session. User may need to log in again.');
      } else {
        const response = await fetch(`${window.VOUCHR_CONFIG.apiBaseUrl}/api/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const freshData = await response.json();
          Object.assign(user, freshData);

          if (freshData.userOrganizations) {
            userOrganizations = freshData.userOrganizations;
          }

          localStorage.setItem('user', JSON.stringify(user));
          console.log('Fresh user data loaded. Orgs:', Object.keys(userOrganizations));
        } else {
          console.error('Failed to fetch fresh user data. Status:', response.status);
          const errText = await response.text();
          console.error(errText);
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch fresh org data', err);
  }

  const orgIds = Object.keys(userOrganizations);

  if (orgIds.length === 0) {
    if (unattachedBanner) unattachedBanner.style.display = "block";
    portalContent.style.display = "none";
    if (orgSwitcherContainer) orgSwitcherContainer.style.display = "none";
    return;
  }

  if (unattachedBanner) unattachedBanner.style.display = "none";
  portalContent.style.display = "block";
  if (orgSwitcherContainer) orgSwitcherContainer.style.display = "block";

  activeOrgSelect.innerHTML = orgIds.map(id => `
    <option value="${id}">${userOrganizations[id].name}</option>
  `).join("");

  const updateOrgContext = (orgId) => {
  const org = userOrganizations[orgId];
  if (!org) return;

  localStorage.setItem("activeOrgId", orgId);
  if (orgEyebrow) orgEyebrow.textContent = org.name;

  const isAdmin = org.role === "ROLE_ORG_ADMIN" || org.role === "ADMIN";
  if (userRoleDisplay) userRoleDisplay.textContent = isAdmin ? "Organization Admin" : "Staff";
  if (navManageStaff) navManageStaff.style.display = isAdmin ? "inline-block" : "none";

  // ----- View switching -----
  const feedingView   = document.getElementById("feeding-scheme-view");
  const defaultView   = document.getElementById("default-org-view");
  const fsAdmin       = document.getElementById("fs-admin-content");
  const fsStaff       = document.getElementById("fs-staff-content");
  const pageTitle     = document.getElementById("page-title");

  // Hide everything first
  feedingView.style.display = "none";
  defaultView.style.display = "none";
  fsAdmin.style.display = "none";
  fsStaff.style.display = "none";

  const orgType = (org.orgType || "").toUpperCase();

  if (orgType === "FEEDING_SCHEME") {
    feedingView.style.display = "block";
    pageTitle.textContent = "Feeding Scheme Overview";

    if (isAdmin) {
      fsAdmin.style.display = "block";
      loadFeedingSchemeAdminData(orgId);
    } else {
      fsStaff.style.display = "block";
      loadFeedingSchemeStaffData(orgId);
    }
  } else {
    defaultView.style.display = "block";
    pageTitle.textContent = "Overview";
    // later you can load voucher UI here
  }
};

  activeOrgSelect.addEventListener("change", (e) => updateOrgContext(e.target.value));

  const activeOrgId = localStorage.getItem("activeOrgId") || orgIds[0];
  activeOrgSelect.value = activeOrgId;
  updateOrgContext(activeOrgId);

  // Toggle custom amount field
  if (voucherTypeSelect && customAmountGroup) {
    voucherTypeSelect.addEventListener("change", (e) => {
      const isCash = e.target.value === "cash";
      customAmountGroup.style.display = isCash ? "block" : "none";
      if (voucherAmountInput) {
        voucherAmountInput.required = isCash;
        if (!isCash) voucherAmountInput.value = "";
      }
    });
  }
}

async function loadOrgDashboardData(orgId) {
  console.log(`Loading dashboard data for organization: ${orgId}`);
  // TODO: Implement API calls here later
}

document.addEventListener("DOMContentLoaded", initEmployeePortal);

async function loadFeedingSchemeAdminData(orgId) {
  console.log("Loading ADMIN feeding-scheme data for", orgId);
  // TODO: call your APIs and populate
  // #fs-stat-beneficiaries, #fs-admin-beneficiaries-table, etc.
}

async function loadFeedingSchemeStaffData(orgId) {
  console.log("Loading STAFF feeding-scheme data for", orgId);
  // TODO: call your APIs and populate
  // the beneficiary dropdown + recent feedings
}