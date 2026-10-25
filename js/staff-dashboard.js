import { getStoredUser } from './utils.js';
import { createHub } from './api.js';

function getSupabaseClient() {
  if (window._supabaseClient) return window._supabaseClient;

  const cfg = window.VOUCHR_CONFIG?.supabase;
  if (!cfg?.url || !cfg?.anonKey) {
    console.error('VOUCHR_CONFIG.supabase is missing');
    return null;
  }

  if (typeof supabase === 'undefined') {
    console.error('Supabase JS library not found');
    return null;
  }

  const { createClient } = supabase;
  try {
    window._supabaseClient = createClient(cfg.url, cfg.anonKey);
    return window._supabaseClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

async function getAuthToken() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session?.access_token || null;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- Hub: add org ----------
let currentHubId = null;

function showAddOrgSection(hubId) {
  currentHubId = hubId;
  const section = document.getElementById('add-org-to-hub-section');
  if (!section) return;
  section.style.display = 'block';
  const input = document.getElementById('org-search');
  const list = document.getElementById('org-search-results');
  if (input) input.value = '';
  if (list) list.innerHTML = '';
  hideAddOrgMessage();
}

function hideAddOrgMessage() {
  const el = document.getElementById('add-org-message');
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
  el.className = 'message';
}

function showAddOrgMessage(text, type = 'error') {
  const el = document.getElementById('add-org-message');
  if (!el) return;
  el.hidden = false;
  el.textContent = text;
  el.className = `message ${type}`;
}

function setupOrgSearch() {
  const input = document.getElementById('org-search');
  if (!input) return;

  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      document.getElementById('org-search-results').innerHTML = '';
      return;
    }
    timer = setTimeout(() => searchOrganizations(q), 300);
  });
}

async function searchOrganizations(query) {
  const token = await getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(
      `${window.VOUCHR_CONFIG.apiBaseUrl}/api/hub/search-orgs?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Search failed');
    }

    const results = await res.json();
    renderOrgResults(results);
  } catch (err) {
    console.error(err);
    showAddOrgMessage(err.message || 'Search failed');
  }
}

function renderOrgResults(results) {
  const list = document.getElementById('org-search-results');
  if (!list) return;
  list.innerHTML = '';

  if (!results.length) {
    list.innerHTML = '<li><span class="org-meta">No organizations found</span></li>';
    return;
  }

  results.forEach(org => {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.innerHTML = `
      <strong>${escapeHtml(org.name)}</strong>
      <div class="org-meta">${escapeHtml(org.city || '')}</div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    if (org.alreadyInHub) {
      btn.textContent = 'Already in a hub';
      btn.disabled = true;
    } else {
      btn.textContent = 'Add to hub';
      btn.addEventListener('click', () => addOrgToHub(org.organizationId, btn));
    }

    li.append(info, btn);
    list.appendChild(li);
  });
}

async function addOrgToHub(organizationId, button) {
  if (!currentHubId) {
    showAddOrgMessage('No hub selected');
    return;
  }

  button.disabled = true;
  button.textContent = 'Adding…';
  hideAddOrgMessage();

  const token = await getAuthToken();
  if (!token) {
    showAddOrgMessage('Not authenticated');
    button.disabled = false;
    button.textContent = 'Add to hub';
    return;
  }

  try {
    const res = await fetch(
      `${window.VOUCHR_CONFIG.apiBaseUrl}/api/hub/${currentHubId}/add-org`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organizationId })
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to add organization');
    }

    showAddOrgMessage('Organization added to hub', 'success');
    button.textContent = 'Added';
    button.disabled = true;
  } catch (err) {
    console.error(err);
    showAddOrgMessage(err.message || 'Failed to add organization');
    button.disabled = false;
    button.textContent = 'Add to hub';
  }
}

// ---------- main init ----------
async function initEmployeePortal() {
  const portalContent = document.getElementById('org-portal-content');
  if (!portalContent) return;

  const unattachedBanner = document.getElementById('unattached-staff-banner');
  const orgSwitcherContainer = document.getElementById('org-switcher-container');
  const activeOrgSelect = document.getElementById('active-org-select');
  const userRoleDisplay = document.getElementById('user-role-display');
  const navManageStaff = document.getElementById('nav-manage-staff');
  const orgEyebrow = document.getElementById('org-eyebrow');
  const pageTitle = document.getElementById('page-title');

  const user = getStoredUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  let userOrganizations = user.userOrganizations || {};

  try {
    const token = await getAuthToken();
    if (token) {
      const response = await fetch(`${window.VOUCHR_CONFIG.apiBaseUrl}/api/users/me`, {
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
  } catch (err) {
    console.error('Failed to fetch fresh user data', err);
  }

  const orgIds = Object.keys(userOrganizations);

  if (orgIds.length === 0) {
    unattachedBanner.style.display = 'block';
    portalContent.style.display = 'none';
    orgSwitcherContainer.style.display = 'none';
    return;
  }

  unattachedBanner.style.display = 'none';
  portalContent.style.display = 'block';
  orgSwitcherContainer.style.display = 'block';

  activeOrgSelect.innerHTML = orgIds.map(id =>
    `<option value="${id}">${escapeHtml(userOrganizations[id].name)}</option>`
  ).join('');

  const updateOrgContext = (orgId) => {
    const org = userOrganizations[orgId];
    if (!org) return;

    localStorage.setItem('activeOrgId', orgId);
    orgEyebrow.textContent = org.name;

    const isAdmin = org.role === 'ROLE_ORG_ADMIN' || org.role === 'ADMIN';
    userRoleDisplay.textContent = isAdmin ? 'Organization Admin' : 'Staff';
    navManageStaff.style.display = isAdmin ? 'inline-block' : 'none';

    // An org can only belong to one hub, so creating one is only offered when it has none
    const createHubSection = document.getElementById('create-hub-section');
    if (createHubSection) {
      createHubSection.style.display = isAdmin && !org.hubId ? 'block' : 'none';
    }

    const hubInfo = document.getElementById('hub-info');
    const scopeContainer = document.getElementById('children-scope-container');
    const scopeSelect = document.getElementById('children-scope');
    if (hubInfo) {
      hubInfo.textContent = org.hubId ? `Hub: ${org.hubName || ''}` : '';
      hubInfo.style.display = org.hubId ? 'block' : 'none';
    }
    if (scopeContainer) scopeContainer.style.display = org.hubId ? 'block' : 'none';
    if (scopeSelect) scopeSelect.value = 'org';

    // If this org already has a hub, show the "add org" section
    if (isAdmin && org.hubId) {
      showAddOrgSection(org.hubId);
    } else {
      const addSection = document.getElementById('add-org-to-hub-section');
      if (addSection) addSection.style.display = 'none';
      currentHubId = null;
    }

    const feedingView = document.getElementById('feeding-scheme-view');
    const defaultView = document.getElementById('default-org-view');

    feedingView.style.display = 'none';
    defaultView.style.display = 'none';

    const orgType = (org.orgType || '').toUpperCase();

    if (orgType === 'FEEDING_SCHEME') {
      feedingView.style.display = 'block';
      pageTitle.textContent = 'Feeding Scheme';
      loadChildren(orgId);
    } else {
      defaultView.style.display = 'block';
      pageTitle.textContent = 'Overview';
    }
  };

  activeOrgSelect.addEventListener('change', (e) => updateOrgContext(e.target.value));

  const childrenScope = document.getElementById('children-scope');
  if (childrenScope) {
    childrenScope.addEventListener('change', () => loadChildren(activeOrgSelect.value));
  }

  const activeOrgId = localStorage.getItem('activeOrgId') || orgIds[0];
  activeOrgSelect.value = activeOrgId;
  updateOrgContext(activeOrgId);

  // Add Child form
  const form = document.getElementById('add-child-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const orgId = activeOrgSelect.value;
      const payload = {
        name: document.getElementById('child-name').value.trim(),
        surname: document.getElementById('child-surname').value.trim(),
        gender: document.getElementById('child-gender').value || null,
        school: document.getElementById('child-school').value.trim() || null
      };

      const token = await getAuthToken();
      if (!token) return;

      try {
        const res = await fetch(
          `${window.VOUCHR_CONFIG.apiBaseUrl}/api/feeding-scheme/${orgId}/children`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          }
        );

        if (res.ok) {
          form.reset();
          loadChildren(orgId);
          alert('Child added successfully');
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.message || 'Failed to add child');
        }
      } catch (err) {
        console.error(err);
        alert('Network error');
      }
    });
  }

  // Create Hub form
  const createHubForm = document.getElementById('create-hub-form');
  if (createHubForm) {
    createHubForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const orgId = activeOrgSelect.value;
      if (!orgId) {
        alert('No active organisation selected');
        return;
      }

      const payload = {
        organizationId: orgId,
        hubName: document.getElementById('hub-name').value.trim() || null,
        city: document.getElementById('hub-city').value.trim() || null
      };

      const messageEl = document.getElementById('create-hub-message');
      messageEl.textContent = 'Creating hub…';

      try {
        const data = await createHub(payload);
        messageEl.textContent = `Hub “${data.hubName || payload.hubName || 'created'}” created successfully.`;
        createHubForm.reset();

        // Persist hubId on the local user object so the add-org section appears
        if (data.hubId && userOrganizations[orgId]) {
          userOrganizations[orgId].hubId = data.hubId;
          userOrganizations[orgId].hubName = data.hubName;
          user.userOrganizations = userOrganizations;
          localStorage.setItem('user', JSON.stringify(user));
          updateOrgContext(orgId);
        }
      } catch (err) {
        console.error(err);
        messageEl.textContent = err.message || 'Failed to create hub';
      }
    });
  }

  setupOrgSearch();
}

async function loadChildren(orgId) {
  const container = document.getElementById('children-list');
  const token = await getAuthToken();
  if (!token) return;

  const showHub = document.getElementById('children-scope')?.value === 'hub';
  const endpoint = showHub ? 'hub-children' : 'children';

  try {
    const res = await fetch(
      `${window.VOUCHR_CONFIG.apiBaseUrl}/api/feeding-scheme/${orgId}/${endpoint}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!res.ok) {
      container.innerHTML = '<p class="muted">Failed to load children.</p>';
      return;
    }

    const children = await res.json();

    if (children.length === 0) {
      container.innerHTML = '<p class="muted">No children added yet.</p>';
      return;
    }

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Surname</th>
            <th>Gender</th>
            <th>School</th>
            <th>Organisation</th>
            <th>Registered by</th>
            <th>Added</th>
          </tr>
        </thead>
        <tbody>
          ${children.map(c => `
            <tr>
              <td>${escapeHtml(c.name)}</td>
              <td>${escapeHtml(c.surname)}</td>
              <td>${escapeHtml(c.gender || '—')}</td>
              <td>${escapeHtml(c.school || '—')}</td>
              <td>${escapeHtml(c.organizationName || '—')}</td>
              <td>${escapeHtml(c.registeredByName || '—')}</td>
              <td>${c.createdDate ? new Date(c.createdDate).toLocaleDateString() : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="muted">Error loading children.</p>';
  }
}

document.addEventListener('DOMContentLoaded', initEmployeePortal);