import {
  getProject, updateProject, getBeneficiaries, addBeneficiary, getPeople,
  getProjectParticipants, inviteProjectParticipant, answerProjectParticipant, getPartnerships
} from './api.js';
import { getStoredUser } from './utils.js';
import {
  getAuthToken, escapeHtml, PREREQUISITE_SERVICES, serviceName, projectTypeName, fillSelect
} from './session.js';
import { initAid } from './aid.js';

// Type-specific details stored in the beneficiary's JSONB `attributes`.
const EXTRA_FIELDS = {
  FEEDING_SCHEME: [],
  GLASSES_DRIVE: [{ key: 'prescription', label: 'Prescription / notes', placeholder: 'e.g. +1.50 both eyes' }],
  SCHOOL_SUPPLIES_DRIVE: [{ key: 'grade', label: 'Grade', placeholder: 'e.g. 4' }],
  CLOTHING_DRIVE: [{ key: 'sizes', label: 'Sizes', placeholder: 'e.g. child 6-7, adult M' }],
  OTHER: []
};

const projectId = new URLSearchParams(window.location.search).get('id');
let project = null;
let enrolled = [];
let participants = [];
/** The organisation whose people we enrol: the active one when it takes part, otherwise one of ours that does. */
let enrolOrgId = null;
let aid = null;

const PARTICIPANT_BADGES = {
  PENDING: '<span class="badge badge-redeemed">Invited</span>',
  ACTIVE: '<span class="badge badge-active">Taking part</span>',
  DECLINED: '<span class="badge badge-expired">Declined</span>',
  ENDED: '<span class="badge badge-expired">Ended</span>'
};

const CONSENT_LABELS = {
  VALID: 'Consent signed', MISSING: 'No consent', WITHDRAWN: 'Consent withdrawn',
  NEEDS_OWN_CONSENT: 'Needs own consent'
};

function show(id, visible) {
  document.getElementById(id).hidden = !visible;
}

function showError(text) {
  const el = document.getElementById('project-error');
  el.textContent = text;
  el.hidden = false;
  show('project-content', false);
}

function renderHeader() {
  document.title = `${project.name} — Vouchr`;
  document.getElementById('project-eyebrow').textContent =
    `${projectTypeName(project.projectType, project.typeLabel)} · ${project.organizationName}`;
  document.getElementById('project-title').textContent = project.name;
  document.getElementById('project-description').textContent = project.description || '';

  const badges = [];
  if (project.status === 'ARCHIVED') badges.push('<span class="badge badge-expired">Archived</span>');
  if (project.participant) badges.push('<span class="badge badge-active">Joined</span>');
  if (project.requiredServiceType) {
    const label = serviceName(project.requiredServiceType).toLowerCase();
    badges.push(`<span class="badge badge-redeemed">Requires ${escapeHtml(label)}${project.requirementEnforcement === 'BLOCK' ? ' (strict)' : ''}</span>`);
  }
  document.getElementById('project-badges').innerHTML = badges.join(' ');

  const banner = document.getElementById('readonly-banner');
  banner.hidden = !project.participant;
  if (project.participant) {
    banner.className = 'message';
    banner.textContent = `This project is run by ${project.organizationName}. You can enrol your own people in it; only they can change its settings.`;
  }

  show('settings-section', project.canAdmin);
  document.getElementById('status-select').value = project.status;
  syncPrerequisiteSelect();
  document.getElementById('enforcement-select').value = project.requirementEnforcement || 'WARN';

  const canAdd = project.canEdit && project.status === 'ACTIVE';
  show('add-section', canAdd);
  show('aid-section', project.canEdit);
  show('session-start', canAdd);
  document.getElementById('extra-fields').innerHTML = (EXTRA_FIELDS[project.projectType] || []).map(f => `
    <div class="form-group">
      <label for="attr-${escapeHtml(f.key)}">${escapeHtml(f.label)}</label>
      <input type="text" id="attr-${escapeHtml(f.key)}" data-attr="${escapeHtml(f.key)}"
             maxlength="255" placeholder="${escapeHtml(f.placeholder)}">
    </div>`).join('');
}

/** The short list of prerequisites; a project that already has another one keeps showing it. */
function syncPrerequisiteSelect() {
  const select = document.getElementById('required-service-select');
  const labels = { ...PREREQUISITE_SERVICES };
  if (project.requiredServiceType && !labels[project.requiredServiceType]) {
    labels[project.requiredServiceType] = serviceName(project.requiredServiceType);
  }
  fillSelect(select, labels, 'No prerequisite');
  select.value = project.requiredServiceType || '';
}

async function loadBeneficiaries() {
  const container = document.getElementById('beneficiaries');
  try {
    const people = await getBeneficiaries(projectId, await getAuthToken());
    enrolled = people;
    if (!people.length) {
      container.innerHTML = '<p class="muted">Nobody has been added yet.</p>';
      return;
    }

    const extras = EXTRA_FIELDS[project.projectType] || [];
    const showOrg = participants.some(p => p.status === 'ACTIVE');
    const showRequirement = !!project.requiredServiceType;

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Surname</th>
              <th>Gender</th>
              ${extras.map(f => `<th>${escapeHtml(f.label)}</th>`).join('')}
              ${showOrg ? '<th>Organisation</th>' : ''}
              <th>Consent</th>
              ${showRequirement ? '<th>Prerequisite</th>' : ''}
              <th>Enrolled by</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            ${people.map(p => `
              <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.surname)}</td>
                <td>${escapeHtml(p.gender || '—')}</td>
                ${extras.map(f => `<td>${escapeHtml(p.attributes?.[f.key] ?? '—')}</td>`).join('')}
                ${showOrg ? `<td>${escapeHtml(p.organizationName)}</td>` : ''}
                <td>${escapeHtml(CONSENT_LABELS[p.consentStatus] || p.consentStatus)}</td>
                ${showRequirement ? `<td>${p.requirementMet == null ? '—' : p.requirementMet
                  ? '<span class="badge badge-active">Met</span>'
                  : '<span class="badge badge-expired">Not met</span>'}</td>` : ''}
                <td>${escapeHtml(p.registeredByName || '—')}</td>
                <td>${p.createdDate ? new Date(p.createdDate).toLocaleDateString() : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="muted">${escapeHtml(err.message || 'Failed to load people.')}</p>`;
  }
}

async function saveSettings() {
  const message = document.getElementById('settings-message');
  const required = document.getElementById('required-service-select').value;
  const changes = {
    status: document.getElementById('status-select').value,
    requirementEnforcement: document.getElementById('enforcement-select').value,
    ...(required ? { requiredServiceType: required } : { clearRequiredService: true })
  };
  message.textContent = 'Saving…';
  try {
    project = await updateProject(projectId, changes, await getAuthToken());
    message.textContent = 'Saved.';
  } catch (err) {
    console.error(err);
    message.textContent = err.message || 'Failed to save';
  }
  renderHeader(); // show what is stored
  loadEnrolPeople();
}

async function init() {
  if (!projectId) {
    showError('No project selected.');
    return;
  }

  try {
    project = await getProject(projectId, await getAuthToken());
  } catch (err) {
    console.error(err);
    showError(err.message || 'Could not load this project.');
    return;
  }

  show('project-content', true);
  await loadParticipants();
  renderHeader();
  await loadBeneficiaries();

  document.getElementById('save-settings').addEventListener('click', saveSettings);

  if (project.canEdit && project.status === 'ACTIVE') {
    await loadEnrolPeople();
  }
  document.getElementById('enrol-search').addEventListener('input', renderEnrolResults);
  document.getElementById('enrol-results').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-enrol]');
    if (b) chooseToEnrol(b.dataset.enrol);
  });
  document.getElementById('enrol-confirm').addEventListener('click', () => enrol(pendingPerson, readExtraFields()));
  document.getElementById('enrol-cancel').addEventListener('click', cancelEnrol);

  document.getElementById('invite-btn').addEventListener('click', inviteOrganisation);
  document.getElementById('participants-list').addEventListener('click', endParticipation);

  aid = initAid({ projectId, getEnrolled: () => enrolled, getOrgId: () => enrolOrgId });
  if (project.canEdit) await aid.loadSessions();
}

// ---------- working together ----------

/** Who is taking part, which of our organisations enrols people, and (for the owner's admin) who can be invited. */
async function loadParticipants() {
  try {
    participants = await getProjectParticipants(projectId, await getAuthToken());
  } catch (err) {
    console.error(err);
    participants = [];
  }

  // the organisation whose people we enrol: the active one if it takes part, otherwise one of ours that does
  const involved = new Set([project.organizationId,
    ...participants.filter(p => p.status === 'ACTIVE').map(p => p.organizationId)]);
  const mine = Object.keys(getStoredUser()?.userOrganizations || {}).filter(id => involved.has(id));
  const active = localStorage.getItem('activeOrgId');
  enrolOrgId = mine.includes(active) ? active : (mine[0] || project.organizationId);
  const names = getStoredUser()?.userOrganizations || {};
  document.getElementById('enrol-org').textContent = names[enrolOrgId]
    ? `Enrolling people from ${names[enrolOrgId].name}.` : '';

  renderParticipants();
  await loadInvitable();
}

function renderParticipants() {
  const list = document.getElementById('participants-list');
  const owner = `<li class="family-row"><span><strong>${escapeHtml(project.organizationName)}</strong>
    <span class="mp-meta">runs this project</span></span></li>`;
  const rows = participants.map(p => `
    <li class="family-row">
      <span>${escapeHtml(p.organizationName)} ${PARTICIPANT_BADGES[p.status] || escapeHtml(p.status)}</span>
      ${p.canEnd ? `<button type="button" class="text-link is-danger" data-end="${escapeHtml(p.participantId)}">${
        p.status === 'PENDING' ? 'Withdraw invitation'
          : (p.organizationId === enrolOrgId && project.participant ? 'Leave project' : 'Remove')}</button>` : ''}
    </li>`).join('');
  list.innerHTML = owner + rows;
  show('participants-section', project.canEdit || project.canAdmin);
}

/** Active partners of the owner that are not already invited. */
async function loadInvitable() {
  const box = document.getElementById('invite-box');
  box.hidden = true;
  if (!project.canAdmin || project.status !== 'ACTIVE') return;
  try {
    const partnerships = await getPartnerships(project.organizationId, await getAuthToken());
    const open = new Set(participants.filter(p => p.status === 'PENDING' || p.status === 'ACTIVE').map(p => p.organizationId));
    const options = partnerships.filter(p => p.status === 'ACTIVE').map(p => (
      p.requesterOrganizationId === project.organizationId
        ? { id: p.partnerOrganizationId, name: p.partnerOrganizationName }
        : { id: p.requesterOrganizationId, name: p.requesterOrganizationName }
    )).filter(o => !open.has(o.id));
    const select = document.getElementById('invite-org');
    select.innerHTML = options.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}</option>`).join('');
    box.hidden = !options.length;
    if (!options.length) {
      document.getElementById('participants-message').textContent =
        'To invite another organisation, first agree a partnership with it on the dashboard (Partners tab).';
    }
  } catch (err) {
    console.error(err);
  }
}

async function inviteOrganisation() {
  const message = document.getElementById('participants-message');
  message.textContent = 'Sending…';
  try {
    await inviteProjectParticipant(projectId, document.getElementById('invite-org').value, await getAuthToken());
    message.textContent = 'Invitation sent. Their admin can accept it on their dashboard.';
    await loadParticipants();
  } catch (err) {
    console.error(err);
    message.textContent = err.message || 'Could not send the invitation';
  }
}

async function endParticipation(e) {
  const button = e.target.closest('button[data-end]');
  if (!button) return;
  if (!confirm('End this? Their people are no longer shown here to the other organisation.')) return;
  try {
    await answerProjectParticipant(button.dataset.end, 'end', await getAuthToken());
    // leaving as the participant takes us out of the project
    if (project.participant) { window.location.href = 'staff-dashboard.html'; return; }
    await loadParticipants();
    await loadBeneficiaries();
  } catch (err) {
    console.error(err);
    document.getElementById('participants-message').textContent = err.message || 'Could not end this';
  }
}

let enrolPeople = [];
let pendingPerson = null;

/** People with a valid consent who are not already in this project (the only ones that can be enrolled). */
async function loadEnrolPeople() {
  try {
    const people = await getPeople(enrolOrgId, await getAuthToken());
    const already = new Set(enrolled.map(b => b.personId));
    enrolPeople = people.filter(p => p.consentStatus === 'VALID' && !already.has(p.personId));
  } catch (err) {
    console.error(err);
    enrolPeople = [];
    document.getElementById('add-message').textContent = err.message || 'Could not load people';
  }
  renderEnrolResults();
}

function renderEnrolResults() {
  const results = document.getElementById('enrol-results');
  const q = document.getElementById('enrol-search').value.trim().toLowerCase();
  if (!q) { results.innerHTML = ''; return; }
  const matches = enrolPeople.filter(p => `${p.name} ${p.surname}`.toLowerCase().includes(q)).slice(0, 8);
  results.innerHTML = matches.map(p => `
    <li><span>${escapeHtml(p.name)} ${escapeHtml(p.surname)}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-enrol="${escapeHtml(p.personId)}">Enrol</button></li>`).join('')
    || '<li class="muted">No one found. Only people with a signed consent can be enrolled.</li>';
}

/** Types with extra details ask for them first; the others enrol straight away. */
function chooseToEnrol(personId) {
  const person = enrolPeople.find(p => p.personId === personId);
  if (!person) return;
  if ((EXTRA_FIELDS[project.projectType] || []).length) {
    pendingPerson = person;
    document.getElementById('enrol-chosen').innerHTML = `Enrolling <strong>${escapeHtml(person.name)} ${escapeHtml(person.surname)}</strong>`;
    show('enrol-extra', true);
  } else {
    enrol(person, {});
  }
}

function readExtraFields() {
  const attributes = {};
  document.querySelectorAll('#extra-fields [data-attr]').forEach(input => {
    const value = input.value.trim();
    if (value) attributes[input.dataset.attr] = value;
  });
  return attributes;
}

function cancelEnrol() {
  pendingPerson = null;
  show('enrol-extra', false);
  document.querySelectorAll('#extra-fields [data-attr]').forEach(input => { input.value = ''; });
}

async function enrol(person, attributes) {
  if (!person) return;
  const message = document.getElementById('add-message');
  message.textContent = 'Enrolling…';
  try {
    await addBeneficiary(projectId, { personId: person.personId, attributes }, await getAuthToken());
    message.textContent = `${person.name} ${person.surname} enrolled.`;
    cancelEnrol();
    document.getElementById('enrol-search').value = '';
    await loadBeneficiaries();
    await loadEnrolPeople();
  } catch (err) {
    console.error(err);
    message.textContent = err.message || 'Failed to enrol';
  }
}

document.addEventListener('DOMContentLoaded', init);
