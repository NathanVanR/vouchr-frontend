import {
  getProject, updateProject, getBeneficiaries, addBeneficiary, getPeople
} from './api.js';
import { getAuthToken, escapeHtml, PROJECT_TYPE_LABELS } from './session.js';

// Type-specific details stored in the beneficiary's JSONB `attributes`.
const EXTRA_FIELDS = {
  FEEDING_SCHEME: [{ key: 'school', label: 'School', placeholder: 'e.g. Sunshine Primary' }],
  GLASSES_DRIVE: [{ key: 'prescription', label: 'Prescription / notes', placeholder: 'e.g. +1.50 both eyes' }],
  SCHOOL_SUPPLIES_DRIVE: [
    { key: 'school', label: 'School', placeholder: 'e.g. Sunshine Primary' },
    { key: 'grade', label: 'Grade', placeholder: 'e.g. 4' }
  ],
  OTHER: []
};

const projectId = new URLSearchParams(window.location.search).get('id');
let project = null;
let enrolled = [];

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
    `${PROJECT_TYPE_LABELS[project.projectType] || project.projectType} · ${project.organizationName}`;
  document.getElementById('project-title').textContent = project.name;
  document.getElementById('project-description').textContent = project.description || '';

  const badges = [];
  if (project.status === 'ARCHIVED') badges.push('<span class="badge badge-expired">Archived</span>');
  badges.push(project.visibility === 'SHARED_WITH_HUB'
    ? '<span class="badge badge-active">Shared with hub</span>'
    : '<span class="badge badge-redeemed">Private</span>');
  document.getElementById('project-badges').innerHTML = badges.join(' ');

  const banner = document.getElementById('readonly-banner');
  banner.hidden = project.canEdit;
  if (!project.canEdit) {
    banner.className = 'message';
    banner.textContent = `Shared by ${project.organizationName} with your hub. You can view this project but not change it.`;
  }

  show('settings-section', project.canAdmin);
  document.getElementById('visibility-select').value = project.visibility;
  document.getElementById('status-select').value = project.status;
  document.getElementById('visibility-hint').textContent = project.visibility === 'SHARED_WITH_HUB'
    ? 'Staff of every organisation in your hub can view the people in this project.'
    : 'Only staff of your organisation can view the people in this project.';

  const canAdd = project.canEdit && project.status === 'ACTIVE';
  show('add-section', canAdd);
  document.getElementById('extra-fields').innerHTML = (EXTRA_FIELDS[project.projectType] || []).map(f => `
    <div class="form-group">
      <label for="attr-${escapeHtml(f.key)}">${escapeHtml(f.label)}</label>
      <input type="text" id="attr-${escapeHtml(f.key)}" data-attr="${escapeHtml(f.key)}"
             maxlength="255" placeholder="${escapeHtml(f.placeholder)}">
    </div>`).join('');
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
    const showOrg = !project.canEdit;

    container.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Surname</th>
              <th>Gender</th>
              ${extras.map(f => `<th>${escapeHtml(f.label)}</th>`).join('')}
              ${showOrg ? '<th>Organisation</th>' : '<th>Consent</th>'}
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
                ${showOrg ? `<td>${escapeHtml(p.organizationName)}</td>`
                          : `<td>${escapeHtml(CONSENT_LABELS[p.consentStatus] || p.consentStatus)}</td>`}
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

async function saveSettings(changes) {
  const message = document.getElementById('settings-message');
  message.textContent = 'Saving…';
  try {
    project = await updateProject(projectId, changes, await getAuthToken());
    message.textContent = 'Saved.';
    renderHeader();
  } catch (err) {
    console.error(err);
    message.textContent = err.message || 'Failed to save';
    renderHeader(); // reset the selects to the stored values
  }
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
  renderHeader();
  await loadBeneficiaries();

  document.getElementById('enrol-person').addEventListener('change', prefillFromPerson);
  document.getElementById('visibility-select').addEventListener('change', (e) =>
    saveSettings({ visibility: e.target.value }));
  document.getElementById('status-select').addEventListener('change', (e) =>
    saveSettings({ status: e.target.value }));

  if (project.canEdit && project.status === 'ACTIVE') {
    await loadEnrolOptions();
  }

  const form = document.getElementById('enrol-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const attributes = {};
    form.querySelectorAll('[data-attr]').forEach(input => {
      const value = input.value.trim();
      if (value) attributes[input.dataset.attr] = value;
    });

    const message = document.getElementById('add-message');
    message.textContent = 'Enrolling…';
    try {
      await addBeneficiary(projectId, {
        personId: document.getElementById('enrol-person').value,
        attributes
      }, await getAuthToken());
      form.reset();
      message.textContent = 'Enrolled.';
      await loadBeneficiaries();
      await loadEnrolOptions();
    } catch (err) {
      console.error(err);
      message.textContent = err.message || 'Failed to enrol';
    }
  });
}

let enrolPeople = [];

/** People with a valid consent who are not already in this project. */
async function loadEnrolOptions() {
  const select = document.getElementById('enrol-person');
  const hint = document.getElementById('enrol-hint');
  try {
    const people = await getPeople(project.organizationId, await getAuthToken());
    const already = new Set(enrolled.map(b => b.personId));
    enrolPeople = people.filter(p => p.consentStatus === 'VALID' && !already.has(p.personId));
    const waiting = people.filter(p => p.consentStatus !== 'VALID');

    select.innerHTML = enrolPeople.length
      ? enrolPeople.map(p => `<option value="${escapeHtml(p.personId)}">${escapeHtml(p.name)} ${escapeHtml(p.surname)}</option>`).join('')
      : '<option value="" disabled selected>Everyone with a consent is already enrolled</option>';
    select.disabled = !enrolPeople.length;
    prefillFromPerson();

    hint.textContent = waiting.length
      ? `${waiting.length} ${waiting.length === 1 ? 'person has' : 'people have'} no valid consent yet and cannot be enrolled: `
        + waiting.slice(0, 5).map(p => `${p.name} ${p.surname}`).join(', ') + (waiting.length > 5 ? ', …' : '') + '.'
      : '';
  } catch (err) {
    console.error(err);
    select.innerHTML = `<option value="" disabled selected>${escapeHtml(err.message || 'Could not load people')}</option>`;
    select.disabled = true;
  }
}

/** A child's school is already on file, so start the project's school field from it. */
function prefillFromPerson() {
  const person = enrolPeople.find(p => p.personId === document.getElementById('enrol-person').value);
  const school = document.getElementById('attr-school');
  if (school && person) school.value = person.school || '';
}

document.addEventListener('DOMContentLoaded', init);
