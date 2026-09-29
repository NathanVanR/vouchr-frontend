import { getStoredUser } from './utils.js';

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
    // Optional: Redirect to login if no user is found
    window.location.href = 'login.html';
    return;
  }

  // Safely extract userOrganizations (defaults to empty object if missing)
  let userOrganizations = user.userOrganizations || {};
  
  // OPTIONAL BUT RECOMMENDED: Fetch fresh user context from your API here
  try {
    const freshData = await fetch(`${window.VOUCHR_CONFIG.apiBaseUrl}/users/me/organizations`, ...);
    userOrganizations = await freshData.json();
    // Update local storage so it stays in sync
    user.userOrganizations = userOrganizations;
    localStorage.setItem('user', JSON.stringify(user)); 
  } catch (err) {
    console.error("Failed to fetch fresh org data", err);
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
    
    loadOrgDashboardData(orgId);
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