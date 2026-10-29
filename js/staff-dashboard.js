import { getStoredUser } from './utils.js';
import {
  createHub, createProject, getProjects,
  getHub, getHubProjects, leaveHub, searchHubOrgs, addOrgToHub,
  getPeople, withdrawConsent, getPlatformMe
} from './api.js';
import { getAuthToken, escapeHtml, PROJECT_TYPE_LABELS, RELATIONSHIP_LABELS } from './session.js';
import { openConsentFlow, openConsentPdf } from './consent.js';

// ---------- Projects ----------

function projectCard(project, { showOrg = false } = {}) {
  const badges = [];
  if (project.status === 'ARCHIVED') badges.push('<span class="badge badge-expired">Archived</span>');
  badges.push(project.visibility === 'SHARED_WITH_HUB'
    ? '<span class="badge badge-active">Shared with hub</span>'
    : '<span class="badge badge-redeemed">Private</span>');

  return `
    <a class="project-card" href="project.html?id=${encodeURIComponent(project.projectId)}">
      <span class="project-card-type">${escapeHtml(PROJECT_TYPE_LABELS[project.projectType] || project.projectType)}</span>
      <strong>${escapeHtml(project.name)}</strong>
      ${showOrg ? `<span class="muted">${escapeHtml(project.organizationName)}</span>` : ''}
      ${project.description ? `<span class="muted">${escapeHtml(project.description)}</span>` : ''}
      <span class="project-card-badges">${badges.join(' ')}</span>
    </a>`;
}

async function loadProjects(orgId) {
  const container = document.getElementById('projects-list');
  container.innerHTML = '<p class="muted">Loading projects…</p>';

  try {
    const projects = await getProjects(orgId, await getAuthToken());
    container.innerHTML = projects.length
      ? projects.map(p => projectCard(p)).join('')
      : '<p class="muted">No projects yet. Admins can add one below.</p>';
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="muted">${escapeHtml(err.message || 'Failed to load projects.')}</p>`;
  }
}

// ---------- People & consent ----------

let currentPeople = [];

const CONSENT_BADGES = {
  VALID: '<span class="badge badge-active">Consent signed</span>',
  MISSING: '<span class="badge badge-expired">No consent</span>',
  WITHDRAWN: '<span class="badge badge-expired">Withdrawn</span>',
  NEEDS_OWN_CONSENT: '<span class="badge badge-expired">Needs own consent</span>'
};

const AGE_LABELS = { ADULT: 'Adult', CHILD: 'Child', UNKNOWN: 'Age unknown' };

/** Primary adults first (A-Z), each followed by the dependents registered under them. */
function familyOrder(people) {
  const ids = new Set(people.map(p => p.personId));
  const dependentsOf = new Map();
  people.filter(p => p.primaryPersonId && ids.has(p.primaryPersonId)).forEach(p => {
    if (!dependentsOf.has(p.primaryPersonId)) dependentsOf.set(p.primaryPersonId, []);
    dependentsOf.get(p.primaryPersonId).push(p);
  });
  const heads = people.filter(p => !p.primaryPersonId || !ids.has(p.primaryPersonId));
  return heads.flatMap(h => [{ person: h, dependent: false }, ...(dependentsOf.get(h.personId) || []).map(d => ({ person: d, dependent: true }))]);
}

function personActions(p) {
  const buttons = [];
  if (p.consentStatus === 'VALID' || p.consentStatus === 'WITHDRAWN') {
    buttons.push(`<button type="button" class="text-link" data-action="view" data-consent="${escapeHtml(p.consentId)}">View signed copy</button>`);
  }
  if (p.consentStatus === 'VALID') {
    buttons.push(`<button type="button" class="text-link" data-action="withdraw" data-consent="${escapeHtml(p.consentId)}">Withdraw</button>`);
  }
  if (p.ageGroup !== 'CHILD') {
    // adults sign for themselves; someone who already has a consent can sign again to cover new children
    buttons.push(p.consentStatus === 'VALID'
      ? `<button type="button" class="text-link" data-action="capture" data-person="${escapeHtml(p.personId)}">Add children</button>`
      : `<button type="button" class="text-link" data-action="capture" data-person="${escapeHtml(p.personId)}">Capture consent</button>`);
  }
  return buttons.join('');
}

async function loadPeople(orgId) {
  const container = document.getElementById('people-list');
  container.innerHTML = '<p class="muted">Loading…</p>';

  try {
    currentPeople = await getPeople(orgId, await getAuthToken());
  } catch (err) {
    console.error(err);
    currentPeople = [];
    container.innerHTML = `<p class="muted">${escapeHtml(err.message || 'Failed to load people.')}</p>`;
    return;
  }

  if (!currentPeople.length) {
    container.innerHTML = '<p class="muted">Nobody is registered yet.</p>';
    return;
  }

  const nameOf = (id) => {
    const p = currentPeople.find(x => x.personId === id);
    return p ? `${p.name} ${p.surname}` : '';
  };

  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>Name</th><th>Age group</th><th>Relationship</th><th>Consent</th><th>Shared with partner orgs</th><th></th></tr>
        </thead>
        <tbody>
          ${familyOrder(currentPeople).map(({ person: p, dependent }) => `
            <tr class="${dependent ? 'person-dependent' : ''}">
              <td>${dependent ? '<span class="dependent-indent">↳</span> ' : ''}${escapeHtml(p.name)} ${escapeHtml(p.surname)}</td>
              <td>${AGE_LABELS[p.ageGroup] || escapeHtml(p.ageGroup)}</td>
              <td>${p.relationship ? `${escapeHtml(RELATIONSHIP_LABELS[p.relationship] || p.relationship)} of ${escapeHtml(nameOf(p.primaryPersonId))}` : '—'}</td>
              <td>${CONSENT_BADGES[p.consentStatus] || escapeHtml(p.consentStatus)}</td>
              <td>${p.consentStatus === 'VALID' ? (p.sharesWithPartners ? 'Yes' : 'No') : '—'}</td>
              <td class="table-actions">${personActions(p)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function onPeopleAction(e, orgId) {
  const button = e.target.closest('button[data-action]');
  if (!button) return;

  if (button.dataset.action === 'view') {
    openConsentPdf(button.dataset.consent);
  } else if (button.dataset.action === 'capture') {
    startConsentFlow(orgId, button.dataset.person);
  } else if (button.dataset.action === 'withdraw') {
    // one consent can cover a guardian and their children, and withdrawing it withdraws it for all of them
    const covered = currentPeople.filter(p => p.consentId === button.dataset.consent).map(p => `${p.name} ${p.surname}`);
    const reason = prompt(`Withdraw this consent? It covers: ${covered.join(', ')}.\n\n`
      + 'None of them can be enrolled in a project any more, and they will be hidden from partner organizations.\n\n'
      + 'Reason (optional):');
    if (reason === null) return;
    try {
      await withdrawConsent(button.dataset.consent, reason.trim(), await getAuthToken());
      showMessage('people-message', 'Consent withdrawn.');
      loadPeople(orgId);
    } catch (err) {
      console.error(err);
      showMessage('people-message', err.message || 'Failed to withdraw consent');
    }
  }
}

function startConsentFlow(orgId, signerPersonId = null) {
  openConsentFlow({
    orgId,
    people: currentPeople,
    signerPersonId,
    onDone: () => {
      showMessage('people-message', 'Consent saved.');
      loadPeople(orgId);
    }
  });
}

// ---------- Hub ----------

let currentHubId = null;

function showMessage(id, text, type = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || '';
  if (el.classList.contains('message')) el.className = `message ${type}`.trim();
}

async function loadHub(org, orgId, isAdmin) {
  const hubSection = document.getElementById('hub-section');
  const createHubSection = document.getElementById('create-hub-section');
  const addOrgSection = document.getElementById('add-org-to-hub-section');
  const leaveBtn = document.getElementById('leave-hub-btn');

  currentHubId = org.hubId || null;

  // An org can only be in one hub, so creating one is only offered when it has none
  createHubSection.style.display = isAdmin && !org.hubId ? 'block' : 'none';
  hubSection.style.display = org.hubId ? 'block' : 'none';
  addOrgSection.style.display = isAdmin && org.hubId ? 'block' : 'none';
  leaveBtn.style.display = isAdmin && org.hubId ? 'inline-block' : 'none';
  showMessage('hub-message', '');
  showMessage('add-org-message', '');
  document.getElementById('org-search').value = '';
  document.getElementById('org-search-results').innerHTML = '';

  if (!org.hubId) return;

  document.getElementById('hub-title').textContent = `Hub: ${org.hubName || ''}`;
  document.getElementById('hub-orgs').textContent = 'Loading…';
  const shared = document.getElementById('hub-shared-projects');
  shared.innerHTML = '<p class="muted">Loading…</p>';

  try {
    const token = await getAuthToken();
    const [hub, projects] = await Promise.all([
      getHub(org.hubId, token),
      getHubProjects(org.hubId, token)
    ]);
    const others = hub.organizations.filter(o => o.organizationId !== orgId).map(o => o.name);
    document.getElementById('hub-title').textContent = `Hub: ${hub.hubName} (${hub.city})`;
    document.getElementById('hub-orgs').textContent = others.length
      ? `Also in this hub: ${others.join(', ')}`
      : 'No other organisations have joined this hub yet.';
    shared.innerHTML = projects.length
      ? projects.map(p => projectCard(p, { showOrg: true })).join('')
      : '<p class="muted">No projects have been shared with the hub yet.</p>';
  } catch (err) {
    console.error(err);
    document.getElementById('hub-orgs').textContent = err.message || 'Failed to load hub';
    shared.innerHTML = '';
  }
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
  try {
    const results = await searchHubOrgs(query, await getAuthToken());
    renderOrgResults(results);
  } catch (err) {
    console.error(err);
    showMessage('add-org-message', err.message || 'Search failed', 'error');
  }
}

function renderOrgResults(results) {
  const list = document.getElementById('org-search-results');
  list.innerHTML = '';

  if (!results.length) {
    list.innerHTML = '<li><span class="org-meta">No other organizations match. Organizations you already belong to are not listed.</span></li>';
    return;
  }

  results.forEach(org => {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.innerHTML = `
      <strong>${escapeHtml(org.name)}</strong>
      <div class="org-meta">${escapeHtml(org.city || '')}${org.alreadyInHub ? ' · already in a hub (it must leave that hub first)' : ''}</div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    if (org.alreadyInHub) {
      btn.textContent = 'Already in a hub';
      btn.disabled = true;
    } else {
      btn.textContent = 'Add to hub';
      btn.addEventListener('click', () => addOrg(org.organizationId, btn));
    }

    li.append(info, btn);
    list.appendChild(li);
  });
}

async function addOrg(organizationId, button) {
  if (!currentHubId) {
    showMessage('add-org-message', 'No hub selected', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = 'Adding…';
  showMessage('add-org-message', '');

  try {
    await addOrgToHub(currentHubId, organizationId, await getAuthToken());
    showMessage('add-org-message', 'Organization added to hub', 'success');
    button.textContent = 'Added';
  } catch (err) {
    console.error(err);
    showMessage('add-org-message', err.message || 'Failed to add organization', 'error');
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
    `<option value="${escapeHtml(id)}">${escapeHtml(userOrganizations[id].name)}</option>`
  ).join('');

  const updateOrgContext = (orgId) => {
    const org = userOrganizations[orgId];
    if (!org) return;

    localStorage.setItem('activeOrgId', orgId);
    orgEyebrow.textContent = org.name;

    const isAdmin = org.role === 'ROLE_ORG_ADMIN' || org.role === 'ADMIN';
    userRoleDisplay.textContent = isAdmin ? 'Organization Admin' : 'Staff';
    navManageStaff.style.display = isAdmin ? 'inline-block' : 'none';

    document.getElementById('create-project-section').style.display = isAdmin ? 'block' : 'none';
    showMessage('create-project-message', '');

    loadProjects(orgId);
    loadPeople(orgId);
    loadHub(org, orgId, isAdmin);
  };

  activeOrgSelect.addEventListener('change', (e) => updateOrgContext(e.target.value));

  const activeOrgId = localStorage.getItem('activeOrgId');
  const initialOrgId = orgIds.includes(activeOrgId) ? activeOrgId : orgIds[0];
  activeOrgSelect.value = initialOrgId;
  updateOrgContext(initialOrgId);

  // Add project form
  const projectForm = document.getElementById('create-project-form');
  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orgId = activeOrgSelect.value;

    const payload = {
      name: document.getElementById('project-name').value.trim(),
      projectType: document.getElementById('project-type').value,
      description: document.getElementById('project-description').value.trim() || null
    };

    showMessage('create-project-message', 'Adding project…');
    try {
      await createProject(orgId, payload, await getAuthToken());
      projectForm.reset();
      showMessage('create-project-message', 'Project added.');
      loadProjects(orgId);
    } catch (err) {
      console.error(err);
      showMessage('create-project-message', err.message || 'Failed to add project');
    }
  });

  // People & consent
  document.getElementById('register-people-btn').addEventListener('click', () =>
    startConsentFlow(activeOrgSelect.value));
  document.getElementById('people-list').addEventListener('click', (e) =>
    onPeopleAction(e, activeOrgSelect.value));

  // Create Hub form
  const createHubForm = document.getElementById('create-hub-form');
  createHubForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const orgId = activeOrgSelect.value;
    const payload = {
      organizationId: orgId,
      hubName: document.getElementById('hub-name').value.trim() || null,
      city: document.getElementById('hub-city').value.trim() || null
    };

    showMessage('create-hub-message', 'Creating hub…');
    try {
      const data = await createHub(payload, await getAuthToken());
      createHubForm.reset();
      showMessage('create-hub-message', '');

      userOrganizations[orgId].hubId = data.hubId;
      userOrganizations[orgId].hubName = data.hubName;
      updateOrgContext(orgId);
    } catch (err) {
      console.error(err);
      showMessage('create-hub-message', err.message || 'Failed to create hub');
    }
  });

  // Leave hub
  document.getElementById('leave-hub-btn').addEventListener('click', async () => {
    const orgId = activeOrgSelect.value;
    const org = userOrganizations[orgId];
    if (!org?.hubId) return;

    if (!confirm(`Remove ${org.name} from the hub "${org.hubName}"? Projects will no longer be shared with it.`)) {
      return;
    }

    try {
      await leaveHub(org.hubId, orgId, await getAuthToken());
      delete org.hubId;
      delete org.hubName;
      updateOrgContext(orgId);
    } catch (err) {
      console.error(err);
      showMessage('hub-message', err.message || 'Failed to leave hub');
    }
  });

  setupOrgSearch();

  // Platform admins (configured on the server) get a link to the platform settings
  getAuthToken()
    .then(token => getPlatformMe(token))
    .then(me => {
      if (me.platformAdmin) document.getElementById('nav-platform').style.display = 'inline-block';
    })
    .catch(err => console.error('Could not check platform admin status', err));
}

document.addEventListener('DOMContentLoaded', initEmployeePortal);
