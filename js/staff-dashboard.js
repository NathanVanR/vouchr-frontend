import { getStoredUser } from './utils.js';

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

  // Fetch fresh data
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
    `<option value="${id}">${userOrganizations[id].name}</option>`
  ).join('');

  const updateOrgContext = (orgId) => {
    const org = userOrganizations[orgId];
    if (!org) return;

    localStorage.setItem('activeOrgId', orgId);
    orgEyebrow.textContent = org.name;

    const isAdmin = org.role === 'ROLE_ORG_ADMIN' || org.role === 'ADMIN';
    userRoleDisplay.textContent = isAdmin ? 'Organization Admin' : 'Staff';
    navManageStaff.style.display = isAdmin ? 'inline-block' : 'none';

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

  const activeOrgId = localStorage.getItem('activeOrgId') || orgIds[0];
  activeOrgSelect.value = activeOrgId;
  updateOrgContext(activeOrgId);

  // Add Child form
  const form = document.getElementById('add-child-form');
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

async function loadChildren(orgId) {
  const container = document.getElementById('children-list');
  const token = await getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(
      `${window.VOUCHR_CONFIG.apiBaseUrl}/api/feeding-scheme/${orgId}/children`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
          </tr>
        </thead>
        <tbody>
          ${children.map(c => `
            <tr>
              <td>${escapeHtml(c.name)}</td>
              <td>${escapeHtml(c.surname)}</td>
              <td>${escapeHtml(c.gender || '—')}</td>
              <td>${escapeHtml(c.school || '—')}</td>
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