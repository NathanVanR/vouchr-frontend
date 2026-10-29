import { addStaff } from './api.js';
import { getStoredUser, isDemo } from './utils.js';

function getSupabaseClient() {
  if (window._supabaseClient) return window._supabaseClient;

  const cfg = window.VOUCHR_CONFIG?.supabase;
  if (!cfg?.url || !cfg?.anonKey) {
    console.error('VOUCHR_CONFIG.supabase is missing – check config.js');
    return null;
  }

  if (typeof supabase === 'undefined') {
    console.error('Supabase JS library not found. Add the CDN script BEFORE this file.');
    return null;
  }

  const { createClient } = supabase;
  if (typeof createClient !== 'function') {
    console.error('supabase.createClient is not available');
    return null;
  }

  try {
    window._supabaseClient = createClient(cfg.url, cfg.anonKey);
    return window._supabaseClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const addStaffForm = document.getElementById("add-staff-form");
  const emailInput = document.getElementById("staff-email");
  const roleSelect = document.getElementById("staff-role");
  const submitBtn = document.getElementById("submit-btn");
  const messageDiv = document.getElementById("form-message");
  
  // Org Switcher Elements
  const orgSwitcherContainer = document.getElementById("org-switcher-container");
  const activeOrgSelect = document.getElementById("active-org-select");
  const orgEyebrow = document.getElementById("org-eyebrow");

  const user = getStoredUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  let userOrganizations = user.userOrganizations || {};

  // Fetch fresh user & org data from API
  try {
    const supabaseClient = isDemo() ? null : getSupabaseClient();
    if (supabaseClient) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      const token = session?.access_token;

      if (token) {
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
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch fresh user org data:', err);
  }

  const orgIds = Object.keys(userOrganizations);

  // Render Org Switcher Dropdown
  if (orgIds.length > 0 && activeOrgSelect) {
    if (orgSwitcherContainer) orgSwitcherContainer.style.display = "block";

    activeOrgSelect.innerHTML = orgIds.map(id => `
      <option value="${id}">${userOrganizations[id].name}</option>
    `).join("");

    const updateOrgContext = (id) => {
      localStorage.setItem("activeOrgId", id);
      if (orgEyebrow && userOrganizations[id]) {
        orgEyebrow.textContent = userOrganizations[id].name;
      }
    };

    const activeOrgId = localStorage.getItem("activeOrgId") || orgIds[0];
    activeOrgSelect.value = activeOrgId;
    updateOrgContext(activeOrgId);

    activeOrgSelect.addEventListener("change", (e) => {
      updateOrgContext(e.target.value);
    });
  }

  // Handle Form Submission
  if (addStaffForm) {
    addStaffForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      const role = roleSelect.value;
      const selectedOrgId = activeOrgSelect ? activeOrgSelect.value : localStorage.getItem("activeOrgId");
      const selectedOrgName = selectedOrgId ? userOrganizations[selectedOrgId]?.name : null;

      if (!email || !role) {
        showMessage("Please fill in all fields.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Adding...";
      hideMessage();

      try {
        await addStaff({ 
          email, 
          role,
          organizationId: selectedOrgId,
          organizationName: selectedOrgName
        });
        
        showMessage("Staff member added successfully!", "success");
        addStaffForm.reset();
      } catch (err) {
        showMessage(err.message || "Failed to add staff member.", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add Member";
      }
    });
  }

  function showMessage(msg, type) {
    if (!messageDiv) return;
    messageDiv.textContent = msg;
    messageDiv.style.display = "block";
    messageDiv.style.color = type === "error" ? "#d9534f" : "#28a745";
  }

  function hideMessage() {
    if (!messageDiv) return;
    messageDiv.style.display = "none";
  }
});