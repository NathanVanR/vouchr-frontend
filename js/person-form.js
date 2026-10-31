// js/person-form.js — add a person, or fill in more of their details later.
// Only a name and surname are required. Everything else is
// optional and checked only when it is filled in. Consent is captured separately (consent.js).
import { createPerson, getPerson, updatePerson } from './api.js';
import { getAuthToken, escapeHtml, RELATIONSHIP_OPTIONS } from './session.js';
import {
  isValidStreetAddress, normaliseStreetAddress, STREET_ADDRESS_MESSAGE,
  isValidSaId, dateOfBirthFromSaId, dateOfBirthMatchesId, ageOn, AGE_OF_MAJORITY
} from './utils.js';

const todayIso = () => new Date().toISOString().slice(0, 10);
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

/**
 * @param orgId     organisation the person belongs to
 * @param personId  optional: edit this person instead of adding a new one
 * @param people    the organisation's people (to pick who a person is registered under)
 * @param onDone    called with (person, { captureConsent }) after saving
 */
export async function openPersonForm({ orgId, personId = null, people = [], onDone = () => {} }) {
  const editing = !!personId;
  const dialog = document.createElement('dialog');
  dialog.className = 'consent-dialog';
  dialog.innerHTML = `
    <div class="consent-header">
      <h2>${editing ? 'Update person' : 'Add a person'}</h2>
      <button type="button" class="text-link" id="pf-cancel">Cancel</button>
    </div>
    <div id="pf-body"><p class="muted">Loading…</p></div>
    <p class="message error" id="pf-error" hidden></p>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('#pf-cancel').addEventListener('click', () => dialog.close());
  dialog.showModal();

  const body = dialog.querySelector('#pf-body');
  const errorEl = dialog.querySelector('#pf-error');
  const showError = (text) => { errorEl.textContent = text || ''; errorEl.hidden = !text; };

  let existing = null;
  if (editing) {
    try {
      existing = await getPerson(personId, await getAuthToken());
    } catch (err) {
      body.innerHTML = '';
      showError(err.message || 'Could not load this person');
      return;
    }
  }

  const v = existing || {};
  const a = v.address || {};
  const category = !existing ? 'ADULT'
    : (v.ageGroup === 'CHILD' ? 'CHILD' : (v.ageGroup === 'ADULT' ? 'ADULT' : 'UNKNOWN'));
  const adults = people.filter(p => p.ageGroup !== 'CHILD' && p.personId !== personId);

  const input = (id, label, value, attrs = '') => `
    <div class="form-group"><label for="${id}">${label}</label>
      <input type="text" id="${id}" value="${escapeHtml(value || '')}" ${attrs}></div>`;

  body.innerHTML = `
    <p class="muted">Only a name and surname are needed. Add whatever else you know now and fill in the rest later.
      ${editing ? '' : 'Consent can be captured now or later; a person needs a valid consent before they can take part in a project or have anything shared.'}</p>

    <div class="consent-mode">
      <label><input type="radio" name="category" value="ADULT" ${category === 'ADULT' ? 'checked' : ''}> Adult</label>
      <label><input type="radio" name="category" value="CHILD" ${category === 'CHILD' ? 'checked' : ''}> Child (under 18)</label>
      <label><input type="radio" name="category" value="UNKNOWN" ${category === 'UNKNOWN' ? 'checked' : ''}> Not sure yet</label>
    </div>

    <div class="form-row">
      ${input('pf-name', 'First name', v.name, 'maxlength="255" autocomplete="off"')}
      ${input('pf-surname', 'Surname', v.surname, 'maxlength="255" autocomplete="off"')}
    </div>
    <div class="form-row">
      <div class="form-group"><label for="pf-gender">Gender (optional)</label>
        <select id="pf-gender">
          <option value="">—</option>
          ${GENDERS.map(g => `<option value="${g}" ${v.gender === g ? 'selected' : ''}>${g[0] + g.slice(1).toLowerCase()}</option>`).join('')}
        </select></div>
      <div class="form-group" id="pf-school-group"><label for="pf-school">School (optional)</label>
        <input type="text" id="pf-school" maxlength="255" value="${escapeHtml(v.school || '')}"></div>
    </div>
    <div class="form-row">
      ${input('pf-id', 'South African ID number (optional)', v.idNumber, 'inputmode="numeric" maxlength="13"')}
      <div class="form-group"><label for="pf-dob">Date of birth (optional)</label>
        <input type="date" id="pf-dob" value="${escapeHtml(v.dateOfBirth || '')}" max="${todayIso()}"></div>
    </div>
    <div class="form-row">
      ${input('pf-phone', 'Phone number (optional)', v.phoneNumber, 'type="tel"')}
      ${input('pf-email', 'Email (optional)', v.email, 'type="email"')}
    </div>

    <h3>Address (optional)</h3>
    <div class="form-row">
      ${input('pf-unit', 'Unit number', a.unitNumber)}
      ${input('pf-complex', 'Complex / building', a.complexName)}
    </div>
    ${input('pf-street', 'Street address', a.streetAddress, 'maxlength="255" placeholder="12 Mandela Way"')}
    <div class="form-row">
      ${input('pf-suburb', 'Suburb', a.suburb)}
      ${input('pf-city', 'City', a.city)}
      ${input('pf-province', 'Province', a.province)}
    </div>

    <h3>Registered under (optional)</h3>
    <p class="muted">Leave empty for a child with no parent on record.</p>
    <div class="form-row">
      <div class="form-group"><label for="pf-primary">Adult</label>
        <select id="pf-primary">
          <option value="">—</option>
          ${adults.map(p => `<option value="${escapeHtml(p.personId)}" ${v.primaryPersonId === p.personId ? 'selected' : ''}>${escapeHtml(p.name)} ${escapeHtml(p.surname)}</option>`).join('')}
        </select></div>
      <div class="form-group"><label for="pf-relationship">Relationship to them</label>
        <select id="pf-relationship">
          <option value="">—</option>
          ${RELATIONSHIP_OPTIONS.map(([val, label]) => `<option value="${val}" ${v.relationship === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select></div>
    </div>

    ${editing ? '' : `
      <h3>Consent</h3>
      <div class="consent-mode">
        <label><input type="radio" name="consent-when" value="later" checked> Capture consent later</label>
        <label><input type="radio" name="consent-when" value="now"> Capture consent now</label>
      </div>`}

    <div class="consent-actions">
      <button type="submit" class="btn btn-primary" id="pf-save">${editing ? 'Save changes' : 'Add person'}</button>
    </div>`;

  const get = (id) => body.querySelector('#' + id);
  const val = (id) => get(id).value.trim();
  const selectedCategory = () => body.querySelector('input[name="category"]:checked').value;

  get('pf-id').addEventListener('input', () => {
    const dob = dateOfBirthFromSaId(get('pf-id').value.trim());
    if (dob && !get('pf-dob').value) get('pf-dob').value = dob;
  });

  function validate() {
    if (!val('pf-name') || !val('pf-surname')) return 'Enter the first name and surname.';
    const dob = get('pf-dob').value;
    const id = val('pf-id');
    if (dob && dob > todayIso()) return 'The date of birth cannot be in the future.';
    if (id) {
      if (!isValidSaId(id)) return 'That is not a valid 13-digit South African ID number.';
      if (dob && !dateOfBirthMatchesId(dob, id)) return 'The date of birth does not match the ID number.';
    }
    if (val('pf-street') && !isValidStreetAddress(val('pf-street'))) return STREET_ADDRESS_MESSAGE;
    if (val('pf-primary') && val('pf-primary') === personId) return 'A person cannot be registered under themselves.';
    return '';
  }

  function buildPayload() {
    const text = (id) => val(id);
    const payload = {
      name: text('pf-name'), surname: text('pf-surname'),
      gender: text('pf-gender') || null,
      ageCategory: selectedCategory() === 'UNKNOWN' ? null : selectedCategory(),
      school: text('pf-school'),
      idNumber: text('pf-id'),
      dateOfBirth: get('pf-dob').value || null,
      phoneNumber: text('pf-phone'), email: text('pf-email'),
      primaryPersonId: text('pf-primary') || null,
      relationship: text('pf-relationship') || null
    };
    const address = {
      unitNumber: text('pf-unit'), complexName: text('pf-complex'),
      streetAddress: normaliseStreetAddress(text('pf-street')),
      suburb: text('pf-suburb'), city: text('pf-city'), province: text('pf-province')
    };
    const anyAddress = Object.values(address).some(Boolean);
    if (anyAddress || editing) payload.address = address; // editing: all blank clears the address
    if (!editing) {
      // a new record only carries what is known
      Object.keys(payload).forEach((k) => { if (payload[k] === '' || payload[k] === null) delete payload[k]; });
    }
    return payload;
  }

  get('pf-save').addEventListener('click', async () => {
    const problem = validate();
    if (problem) return showError(problem);
    showError('');
    const save = get('pf-save');
    save.disabled = true;
    save.textContent = 'Saving…';
    try {
      const token = await getAuthToken();
      const payload = buildPayload();
      const person = editing
        ? await updatePerson(personId, payload, token)
        : await createPerson(orgId, payload, token);
      const captureConsent = !editing && body.querySelector('input[name="consent-when"]:checked').value === 'now';
      dialog.close();
      onDone(person, { captureConsent });
    } catch (err) {
      console.error(err);
      showError(err.message || 'Could not save this person');
      save.disabled = false;
      save.textContent = editing ? 'Save changes' : 'Add person';
    }
  });
}
