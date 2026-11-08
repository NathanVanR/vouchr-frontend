import { getStoredUser, isDemo } from './utils.js';
import {
  createProject, getProjects, getProjectInvitations, answerProjectParticipant,
  getPeople, withdrawConsent, getPlatformMe
} from './api.js';
import {
  getAuthToken, escapeHtml, PROJECT_TYPE_LABELS, RELATIONSHIP_LABELS, SERVICE_LABELS, PREREQUISITE_SERVICES,
  serviceName, projectTypeName, fillSelect
} from './session.js';
import { openConsentFlow, openConsentPdf } from './consent.js';
import { openPersonForm } from './person-form.js';
import { initFamilies, loadFamilies } from './families.js';
import { initPartners, loadPartners } from './partners.js';
import { openCarePlanDialog } from './care-plan.js';

// ---------- Projects ----------

function projectCard(project) {
  const badges = [];
  if (project.status === 'ARCHIVED') badges.push('<span class="badge badge-expired">Archived</span>');
  if (project.participant) badges.push('<span class="badge badge-active">Joined</span>');
  if (project.requiredServiceType) {
    badges.push(`<span class="badge badge-redeemed">Requires ${escapeHtml(serviceName(project.requiredServiceType).toLowerCase())}</span>`);
  }

  return `
    <a class="project-card" href="project.html?id=${encodeURIComponent(project.projectId)}">
      <span class="project-card-type">${escapeHtml(projectTypeName(project.projectType, project.typeLabel))}</span>
      <strong>${escapeHtml(project.name)}</strong>
      ${project.participant ? `<span class="muted">Run by ${escapeHtml(project.organizationName)}</span>` : ''}
      ${project.description ? `<span class="muted">${escapeHtml(project.description)}</span>` : ''}
      <span class="project-card-badges">${badges.join(' ')}</span>
    </a>`;
}

async function loadProjects(orgId, isAdmin) {
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
  loadInvitations(orgId, isAdmin);
}

/** Projects other organisations have invited this organisation to work on; only admins can answer. */
async function loadInvitations(orgId, isAdmin) {
  const box = document.getElementById('invitations');
  box.innerHTML = '';
  try {
    const invitations = await getProjectInvitations(orgId, await getAuthToken());
    if (!invitations.length) return;
    box.innerHTML = `
      <h3>Invitations to work together</h3>
      <ul class="family-list">${invitations.map(i => `
        <li class="family-row">
          <span><strong>${escapeHtml(i.ownerOrganizationName)}</strong> invited us to
            <strong>${escapeHtml(i.projectName)}</strong>
            <span class="mp-meta">(${escapeHtml(projectTypeName(i.projectType, i.projectTypeLabel))})</span></span>
          ${isAdmin && i.canRespond ? `
            <span class="actions">
              <button type="button" class="text-link" data-invite-action="accept" data-participant="${escapeHtml(i.participantId)}">Accept</button>
              <button type="button" class="text-link is-danger" data-invite-action="decline" data-participant="${escapeHtml(i.participantId)}">Decline</button>
            </span>` : '<span class="muted">An admin can answer</span>'}
        </li>`).join('')}</ul>`;
  } catch (err) {
    console.error(err);
  }
}

// ---------- People & consent ----------

let currentPeople = [];

const CONSENT_BADGES = {
  VALID: '<span class="badge badge-active">Consent signed</span>',
  MISSING: '<span class="badge badge-expired">No consent yet</span>',
  WITHDRAWN: '<span class="badge badge-expired">Withdrawn</span>',
  NEEDS_OWN_CONSENT: '<span class="badge badge-expired">Needs own consent</span>'
};

const AGE_LABELS = { ADULT: 'Adult', CHILD: 'Child', UNKNOWN: 'Age unknown' };

const FIELD_LABELS = {
  gender: 'gender', dateOfBirth: 'date of birth', idNumber: 'ID number', phoneNumber: 'phone',
  address: 'address', school: 'school'
};

let selectedPersonId = null;

const personFullName = (p) => `${p.name} ${p.surname}`;

/** Names (and schools) matching what was typed; nothing until something is typed. */
function renderPeopleResults() {
  const results = document.getElementById('people-results');
  const q = document.getElementById('people-search').value.trim().toLowerCase();
  if (!q) { results.innerHTML = ''; return; }
  const matches = currentPeople
    .filter(p => `${p.name} ${p.surname} ${p.school || ''}`.toLowerCase().includes(q))
    .sort((x, y) => personFullName(x).localeCompare(personFullName(y)))
    .slice(0, 12);
  results.innerHTML = matches.map(p => `<li>
      <span><button type="button" class="text-link" data-action="select-person" data-person="${escapeHtml(p.personId)}">${escapeHtml(personFullName(p))}</button>
        <span class="muted">${p.ageGroup === 'CHILD' ? 'child' : ''}${p.school ? ` · ${escapeHtml(p.school)}` : ''}</span></span>
    </li>`).join('') || '<li class="muted">No one found.</li>';
}

/** Only the chosen person is shown, as a card (a table of everyone is what made this page cluttered). */
function renderSelectedPerson() {
  const container = document.getElementById('people-list');
  const p = currentPeople.find(x => x.personId === selectedPersonId);
  if (!p) {
    selectedPersonId = null;
    container.innerHTML = `<p class="muted">${currentPeople.length ? 'Search for a person to see their details.' : 'Nobody has been added yet.'}</p>`;
    return;
  }
  const parent = p.primaryPersonId ? currentPeople.find(x => x.personId === p.primaryPersonId) : null;
  const missing = (p.missingFields || []).length
    ? escapeHtml(p.missingFields.map(f => FIELD_LABELS[f] || f).join(', ')) : 'Complete';
  container.innerHTML = `
    <article class="family-card">
      <h3>${escapeHtml(personFullName(p))}</h3>
      <p><strong>Age group:</strong> ${AGE_LABELS[p.ageGroup] || escapeHtml(p.ageGroup)}${p.school ? ` <span class="muted">· ${escapeHtml(p.school)}</span>` : ''}</p>
      ${p.relationship ? `<p><strong>Registered under:</strong> ${escapeHtml(RELATIONSHIP_LABELS[p.relationship] || p.relationship)} of ${escapeHtml(parent ? personFullName(parent) : '')}</p>` : ''}
      <p><strong>Consent:</strong> ${CONSENT_BADGES[p.consentStatus] || escapeHtml(p.consentStatus)}
        ${p.consentStatus === 'VALID' ? `<span class="muted">· shared with partner orgs: ${p.sharesWithPartners ? 'yes' : 'no'}</span>` : ''}</p>
      <p><strong>Not on file yet:</strong> <span class="muted">${missing}</span></p>
      <div class="actions">${personActions(p)}</div>
    </article>`;
}

/** A child is covered by an adult in their own family, so the family must have a registered adult. */
function canCaptureForChild(child) {
  return !!child.familyId && currentPeople.some(x => x.familyId === child.familyId && x.ageGroup !== 'CHILD');
}

function personActions(p) {
  const id = escapeHtml(p.personId);
  const buttons = [
    `<button type="button" class="text-link" data-action="edit" data-person="${id}">Edit</button>`,
    `<button type="button" class="text-link" data-action="care-plan" data-person="${id}">Care plan</button>`
  ];
  if (p.consentStatus === 'VALID') {
    // no signed copy once withdrawn: the record stays in the database as the audit trail
    buttons.push(`<button type="button" class="text-link" data-action="view" data-consent="${escapeHtml(p.consentId)}">View signed copy</button>`);
    buttons.push(`<button type="button" class="text-link is-danger" data-action="withdraw" data-consent="${escapeHtml(p.consentId)}">Withdraw</button>`);
  }
  if (p.ageGroup === 'CHILD') {
    // a child is covered by the signature of a registered adult in their family
    if (p.consentStatus !== 'VALID') {
      // a child is covered by a registered adult in their family, so they need a family with a parent or guardian
      buttons.push(canCaptureForChild(p)
        ? `<button type="button" class="text-link" data-action="capture-child" data-person="${id}">Capture consent</button>`
        : '<span class="muted">Add to a family with a parent or guardian to capture consent</span>');
    }
  } else {
    // adults sign for themselves; someone who already has a consent can sign again to cover more children
    buttons.push(p.consentStatus === 'VALID'
      ? `<button type="button" class="text-link" data-action="capture" data-person="${id}">Add children</button>`
      : `<button type="button" class="text-link" data-action="capture" data-person="${id}">Capture consent</button>`);
  }
  return buttons.join('');
}

export function getCurrentPeople() {
  return currentPeople;
}

export async function loadPeople(orgId) {
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

  renderSelectedPerson();
  renderPeopleResults();
}

async function onPeopleAction(e, orgId, refresh) {
  const button = e.target.closest('button[data-action]');
  if (!button) return;

  if (button.dataset.action === 'select-person') {
    selectedPersonId = button.dataset.person;
    const person = currentPeople.find(p => p.personId === selectedPersonId);
    document.getElementById('people-search').value = person ? personFullName(person) : '';
    document.getElementById('people-results').innerHTML = '';
    renderSelectedPerson();
  } else if (button.dataset.action === 'view') {
    openConsentPdf(button.dataset.consent);
  } else if (button.dataset.action === 'edit') {
    startPersonForm(orgId, button.dataset.person, refresh);
  } else if (button.dataset.action === 'care-plan') {
    const person = currentPeople.find(p => p.personId === button.dataset.person);
    openCarePlanDialog({ orgId, subject: {
      kind: 'person', id: person.personId, name: `${person.name} ${person.surname}`, familyId: person.familyId || null
    } });
  } else if (button.dataset.action === 'capture') {
    startConsentFlow(orgId, { signerPersonId: button.dataset.person }, refresh);
  } else if (button.dataset.action === 'capture-child') {
    startConsentFlow(orgId, { coverPersonIds: [button.dataset.person] }, refresh);
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
      refresh();
    } catch (err) {
      console.error(err);
      showMessage('people-message', err.message || 'Failed to withdraw consent');
    }
  }
}

function startPersonForm(orgId, personId, refresh) {
  openPersonForm({
    orgId,
    personId,
    people: currentPeople,
    onDone: async (person, { captureConsent }) => {
      showMessage('people-message', personId ? 'Details saved.' : 'Person added.');
      await refresh();
      if (captureConsent && person.ageGroup === 'CHILD' && !canCaptureForChild(person)) {
        showMessage('people-message', `Put ${person.name} in a family with a parent or guardian on the Families tab, then capture consent.`);
      } else if (captureConsent) {
        // a child is covered by an adult's signature, an adult signs for themselves
        startConsentFlow(orgId, person.ageGroup === 'CHILD'
          ? { coverPersonIds: [person.personId] }
          : { signerPersonId: person.personId }, refresh);
      }
    }
  });
}

function startConsentFlow(orgId, { signerPersonId = null, coverPersonIds = [] } = {}, refresh) {
  openConsentFlow({
    orgId,
    people: currentPeople,
    signerPersonId,
    coverPersonIds,
    onDone: () => {
      showMessage('people-message', 'Consent saved.');
      refresh();
    }
  });
}

/** People first (families list who is already in one), then the families. */
async function refreshPeopleAndFamilies(orgId) {
  await loadPeople(orgId);
  await loadFamilies(orgId);
}

// ---------- messages ----------

function showMessage(id, text, type = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = !text;
  el.textContent = text || '';
  if (el.classList.contains('message')) el.className = `message ${type}`.trim();
}

// ---------- views & header menu ----------
const VIEWS = { projects: 'Projects', people: 'People', families: 'Families', partners: 'Partners' };

function showView() {
  const name = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'projects';
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== `view-${name}`; });
  document.querySelectorAll('.view-tabs a').forEach(a => {
    const active = a.dataset.view === name;
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.getElementById('page-title').textContent = VIEWS[name];
  window.scrollTo(0, 0);
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

  showView();
  window.addEventListener('hashchange', showView);

  const user = getStoredUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  let userOrganizations = user.userOrganizations || {};

  try {
    const token = await getAuthToken();
    if (token && !isDemo()) {
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

    loadProjects(orgId, isAdmin);
    refreshPeopleAndFamilies(orgId);
    loadPartners(orgId, isAdmin);
  };

  activeOrgSelect.addEventListener('change', (e) => updateOrgContext(e.target.value));

  const activeOrgId = localStorage.getItem('activeOrgId');
  const initialOrgId = orgIds.includes(activeOrgId) ? activeOrgId : orgIds[0];
  activeOrgSelect.value = initialOrgId;
  updateOrgContext(initialOrgId);

  // Add project form (the type and service lists come from the shared catalogue in session.js)
  const projectForm = document.getElementById('create-project-form');
  const typeSelect = document.getElementById('project-type');
  fillSelect(typeSelect, PROJECT_TYPE_LABELS);
  fillSelect(document.getElementById('project-required-service'), PREREQUISITE_SERVICES, 'No prerequisite');
  const syncTypeLabel = () => {
    document.getElementById('project-type-label-group').hidden = typeSelect.value !== 'OTHER';
  };
  typeSelect.addEventListener('change', syncTypeLabel);
  syncTypeLabel();
  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orgId = activeOrgSelect.value;

    const payload = {
      name: document.getElementById('project-name').value.trim(),
      projectType: document.getElementById('project-type').value,
      typeLabel: document.getElementById('project-type').value === 'OTHER'
        ? document.getElementById('project-type-label').value.trim() || null : null,
      description: document.getElementById('project-description').value.trim() || null,
      requiredServiceType: document.getElementById('project-required-service').value || null,
      requirementEnforcement: document.getElementById('project-enforcement').value
    };

    showMessage('create-project-message', 'Adding project…');
    try {
      await createProject(orgId, payload, await getAuthToken());
      projectForm.reset();
      syncTypeLabel();
      showMessage('create-project-message', 'Project added.');
      loadProjects(orgId, true);
    } catch (err) {
      console.error(err);
      showMessage('create-project-message', err.message || 'Failed to add project');
    }
  });

  // People & consent
  const refresh = () => refreshPeopleAndFamilies(activeOrgSelect.value);
  document.getElementById('register-people-btn').addEventListener('click', () =>
    startPersonForm(activeOrgSelect.value, null, refresh));
  document.getElementById('people-list').addEventListener('click', (e) =>
    onPeopleAction(e, activeOrgSelect.value, refresh));
  document.getElementById('people-results').addEventListener('click', (e) =>
    onPeopleAction(e, activeOrgSelect.value, refresh));
  document.getElementById('people-search').addEventListener('input', renderPeopleResults);
  initFamilies({
    getOrgId: () => activeOrgSelect.value,
    getPeopleList: getCurrentPeople,
    refresh,
    showMessage
  });

  initPartners({ getOrgId: () => activeOrgSelect.value, showMessage });

  // Answering an invitation to work on someone else's project
  document.getElementById('invitations').addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-invite-action]');
    if (!button) return;
    try {
      await answerProjectParticipant(button.dataset.participant, button.dataset.inviteAction, await getAuthToken());
      loadProjects(activeOrgSelect.value, true);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not answer the invitation');
    }
  });

  // Platform admins (configured on the server) get a link to the platform settings
  getAuthToken()
    .then(token => getPlatformMe(token))
    .then(me => {
      if (me.platformAdmin) document.getElementById('nav-platform').style.display = 'inline-block';
    })
    .catch(err => console.error('Could not check platform admin status', err));
}

document.addEventListener('DOMContentLoaded', initEmployeePortal);
