// js/consent.js — staff-only registration + witnessed consent, on one device:
//   1. who is registering (a new adult, or someone already registered) and their dependents
//   2. the signer reads the contract, makes the optional choices, ticks ONE box
//   3. the signer signs
//   4. the staff member confirms they witnessed it
import { getConsentForm, signConsent, fetchConsentPdf } from './api.js';
import { getAuthToken, escapeHtml, RELATIONSHIP_OPTIONS } from './session.js';
import {
  isValidStreetAddress, normaliseStreetAddress, STREET_ADDRESS_MESSAGE,
  isValidSaId, dateOfBirthFromSaId, dateOfBirthMatchesId, ageOn, AGE_OF_MAJORITY
} from './utils.js';

const OPTIONAL_TYPES = ['PARTNER_SHARING', 'REFERRALS', 'SPECIAL_INFORMATION', 'ANONYMISED_RESEARCH'];

/** Opens the signed copy of a consent in a new tab. */
export async function openConsentPdf(consentId) {
  const tab = window.open('', '_blank');
  try {
    const blob = await fetchConsentPdf(consentId, await getAuthToken());
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch (err) {
    if (tab) tab.close();
    alert(err.message || 'Could not open the signed copy');
  }
}

/** Freehand signature capture on a canvas (mouse, touch or pen). */
function createSignaturePad(canvas) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000';
  canvas.style.touchAction = 'none';

  let drawing = false;
  let points = 0;

  const position = (e) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = position(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const { x, y } = position(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    points++;
  });
  const stop = () => { drawing = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  return {
    isEmpty: () => points < 15,
    clear: () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      points = 0;
    },
    toDataUrl: () => canvas.toDataURL('image/png')
  };
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const blankSigner = () => ({
  name: '', surname: '', idNumber: '', dob: '', gender: '', phone: '', email: '',
  unit: '', complex: '', street: '', suburb: '', city: '', province: ''
});
const blankDependent = () => ({ name: '', surname: '', dob: '', gender: '', relationship: 'CHILD', idNumber: '' });

/**
 * @param orgId          organisation the consent is for
 * @param people         the organisation's people (from GET /people)
 * @param signerPersonId optional: open straight on an already-registered adult
 * @param onDone         called after a successful signing (refresh the caller's lists)
 */
export function openConsentFlow({ orgId, people = [], signerPersonId = null, onDone = () => {} }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'consent-dialog';
  dialog.innerHTML = `
    <div class="consent-header">
      <h2 id="consent-title"></h2>
      <button type="button" class="text-link" id="consent-cancel" style="background:none;border:none;cursor:pointer;">Cancel</button>
    </div>
    <div id="consent-body"></div>
    <p class="message error" id="consent-error" hidden></p>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('#consent-cancel').addEventListener('click', () => dialog.close());
  dialog.showModal();

  const body = dialog.querySelector('#consent-body');
  const title = dialog.querySelector('#consent-title');
  const errorEl = dialog.querySelector('#consent-error');

  const eligible = people.filter(p => p.ageGroup !== 'CHILD'); // adults (and people whose age is not known yet)
  const state = {
    mode: signerPersonId && eligible.some(p => p.personId === signerPersonId) ? 'existing' : 'new',
    signerPersonId: signerPersonId || (eligible[0] && eligible[0].personId) || null,
    signer: blankSigner(),
    extra: { dob: '', idNumber: '' },        // for an existing person whose record lacks them
    dependents: [],
    form: null,
    acknowledgements: {},
    relationshipToDependents: 'PARENT',
    signature: null,
    pad: null
  };

  const showError = (text) => {
    errorEl.textContent = text || '';
    errorEl.hidden = !text;
  };

  const existingSigner = () => people.find(p => p.personId === state.signerPersonId) || null;
  const signerName = () => state.mode === 'new'
    ? `${state.signer.name} ${state.signer.surname}`.trim()
    : (existingSigner() ? `${existingSigner().name} ${existingSigner().surname}` : '');

  /** Registered children of the existing signer who still need covering. */
  const existingChildrenToCover = () => state.mode !== 'existing' ? [] : people.filter(p =>
    p.primaryPersonId === state.signerPersonId && p.ageGroup === 'CHILD' && p.consentStatus !== 'VALID');
  const newChildren = () => state.dependents.filter(d => d.dob && ageOn(d.dob) < AGE_OF_MAJORITY);
  const newAdults = () => state.dependents.filter(d => d.dob && ageOn(d.dob) >= AGE_OF_MAJORITY);
  const childrenCovered = () => newChildren().length + existingChildrenToCover().length;

  // ---------- step 1: who is registering ----------
  function stepWho() {
    title.textContent = 'Step 1 of 4 — Who is registering?';
    showError('');
    const s = state.signer;
    const input = (id, label, value, attrs = '') => `
      <div class="form-group"><label for="${id}">${label}</label>
        <input type="text" id="${id}" value="${escapeHtml(value)}" ${attrs}></div>`;

    body.innerHTML = `
      <div class="consent-mode">
        <label><input type="radio" name="mode" value="new" ${state.mode === 'new' ? 'checked' : ''}> Register a new adult</label>
        <label><input type="radio" name="mode" value="existing" ${state.mode === 'existing' ? 'checked' : ''}
          ${eligible.length ? '' : 'disabled'}> Someone already registered</label>
      </div>
      <p class="muted">Every adult (18 or older) signs their own consent. A parent or legal guardian's signature
        also covers their children.</p>

      <div id="who-new" ${state.mode === 'new' ? '' : 'hidden'}>
        <div class="form-row">
          ${input('w-name', 'First name', s.name, 'maxlength="255" autocomplete="off"')}
          ${input('w-surname', 'Surname', s.surname, 'maxlength="255" autocomplete="off"')}
        </div>
        <div class="form-row">
          ${input('w-id', 'South African ID number', s.idNumber, 'inputmode="numeric" maxlength="13"')}
          <div class="form-group"><label for="w-dob">Date of birth</label>
            <input type="date" id="w-dob" value="${escapeHtml(s.dob)}" max="${todayIso()}"></div>
          <div class="form-group"><label for="w-gender">Gender (optional)</label>
            <select id="w-gender">
              <option value="">—</option>
              ${['MALE', 'FEMALE', 'OTHER'].map(g => `<option value="${g}" ${s.gender === g ? 'selected' : ''}>${g[0] + g.slice(1).toLowerCase()}</option>`).join('')}
            </select></div>
        </div>
        <div class="form-row">
          ${input('w-phone', 'Phone number (optional)', s.phone, 'type="tel"')}
          ${input('w-email', 'Email (optional)', s.email, 'type="email"')}
        </div>
        <div class="form-row">
          ${input('w-unit', 'Unit number (optional)', s.unit)}
          ${input('w-complex', 'Complex / building (optional)', s.complex)}
        </div>
        ${input('w-street', 'Street address', s.street, 'maxlength="255" placeholder="12 Mandela Way"')}
        <p class="muted" style="margin-top: -0.5rem;">Street number and street name, for example 12 Mandela Way.</p>
        <div class="form-row">
          ${input('w-suburb', 'Suburb', s.suburb)}
          ${input('w-city', 'City', s.city)}
          ${input('w-province', 'Province', s.province)}
        </div>
      </div>

      <div id="who-existing" ${state.mode === 'existing' ? '' : 'hidden'}>
        <div class="form-group"><label for="e-person">Person</label>
          <select id="e-person">
            ${eligible.map(p => `<option value="${escapeHtml(p.personId)}" ${p.personId === state.signerPersonId ? 'selected' : ''}>
              ${escapeHtml(p.name)} ${escapeHtml(p.surname)}${p.consentStatus === 'VALID' ? ' (has a consent: add children)' : ''}</option>`).join('')}
          </select></div>
        <div id="e-extra"></div>
        <div id="e-children" class="muted"></div>
      </div>

      <h3>Dependents</h3>
      <p class="muted">Optional. Children under 18 are covered by this signature; dependents who are 18 or older
        have to sign their own consent.</p>
      <div id="dependents"></div>
      <button type="button" class="btn" id="add-dependent">Add a dependent</button>
      <div class="consent-actions"><button type="button" class="btn btn-primary" id="next">Next</button></div>`;

    const get = (id) => body.querySelector('#' + id);
    const noteFor = (d) => !d.dob ? '' : (ageOn(d.dob) < AGE_OF_MAJORITY
      ? 'Under 18: covered by this consent.'
      : '18 or older: must sign their own consent.');

    // dependents
    const list = get('dependents');
    const renderDependents = () => {
      list.innerHTML = state.dependents.map((d, i) => `
        <div class="dependent-row" data-index="${i}">
          <div class="form-row">
            <div class="form-group"><label>First name</label>
              <input type="text" data-field="name" maxlength="255" value="${escapeHtml(d.name)}"></div>
            <div class="form-group"><label>Surname</label>
              <input type="text" data-field="surname" maxlength="255" value="${escapeHtml(d.surname)}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Date of birth</label>
              <input type="date" data-field="dob" max="${todayIso()}" value="${escapeHtml(d.dob)}"></div>
            <div class="form-group"><label>Relationship to the adult</label>
              <select data-field="relationship">
                ${RELATIONSHIP_OPTIONS.map(([v, l]) => `<option value="${v}" ${d.relationship === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Gender (optional)</label>
              <select data-field="gender">
                <option value="">—</option>
                ${['MALE', 'FEMALE', 'OTHER'].map(g => `<option value="${g}" ${d.gender === g ? 'selected' : ''}>${g[0] + g.slice(1).toLowerCase()}</option>`).join('')}
              </select></div>
            <div class="form-group"><label>ID number (optional)</label>
              <input type="text" data-field="idNumber" inputmode="numeric" maxlength="13" value="${escapeHtml(d.idNumber)}"></div>
          </div>
          <p class="muted dependent-note">${noteFor(d)}</p>
          <button type="button" class="text-link" data-remove="${i}" style="background:none;border:none;cursor:pointer;">Remove</button>
        </div>`).join('');
    };
    list.addEventListener('input', (e) => {
      const row = e.target.closest('[data-index]');
      if (!row || !e.target.dataset.field) return;
      const d = state.dependents[Number(row.dataset.index)];
      d[e.target.dataset.field] = e.target.value;
      row.querySelector('.dependent-note').textContent = noteFor(d);
    });
    list.addEventListener('click', (e) => {
      if (e.target.dataset.remove === undefined) return;
      collect();
      state.dependents.splice(Number(e.target.dataset.remove), 1);
      renderDependents();
    });
    get('add-dependent').addEventListener('click', () => {
      collect();
      state.dependents.push(blankDependent());
      renderDependents();
    });
    renderDependents();

    // existing signer: ask only for what the record lacks, and list children that will be covered
    const renderExisting = () => {
      const p = existingSigner();
      const extra = get('e-extra');
      const children = get('e-children');
      if (!p) {
        extra.innerHTML = '';
        children.textContent = '';
        return;
      }
      extra.innerHTML = `
        ${p.ageGroup === 'UNKNOWN' ? `<div class="form-group"><label for="e-dob">Date of birth</label>
          <input type="date" id="e-dob" value="${escapeHtml(state.extra.dob)}" max="${todayIso()}"></div>` : ''}
        ${!p.hasIdNumber ? `<div class="form-group"><label for="e-id">South African ID number</label>
          <input type="text" id="e-id" inputmode="numeric" maxlength="13" value="${escapeHtml(state.extra.idNumber)}"></div>` : ''}`;
      const kids = existingChildrenToCover();
      children.textContent = kids.length
        ? `Also covered by this signature: ${kids.map(k => `${k.name} ${k.surname}`).join(', ')}.`
        : '';
    };
    renderExisting();
    get('e-person').addEventListener('change', () => {
      collect();
      state.signerPersonId = get('e-person').value;
      renderExisting();
    });

    // new signer: fill the date of birth from a valid ID number
    get('w-id').addEventListener('input', () => {
      const dob = dateOfBirthFromSaId(get('w-id').value.trim());
      if (dob && !get('w-dob').value) get('w-dob').value = dob;
    });

    body.querySelectorAll('input[name="mode"]').forEach(radio => radio.addEventListener('change', () => {
      collect();
      state.mode = radio.value;
      get('who-new').hidden = state.mode !== 'new';
      get('who-existing').hidden = state.mode !== 'existing';
      renderExisting();
    }));

    function collect() {
      const val = (id) => (get(id) ? get(id).value.trim() : '');
      Object.assign(state.signer, {
        name: val('w-name'), surname: val('w-surname'), idNumber: val('w-id'), dob: val('w-dob'),
        gender: val('w-gender'), phone: val('w-phone'), email: val('w-email'), unit: val('w-unit'),
        complex: val('w-complex'), street: val('w-street'), suburb: val('w-suburb'), city: val('w-city'),
        province: val('w-province')
      });
      if (get('e-dob')) state.extra.dob = val('e-dob');
      if (get('e-id')) state.extra.idNumber = val('e-id');
    }

    get('next').addEventListener('click', () => {
      collect();
      const problem = validateWho();
      if (problem) return showError(problem);
      stepRead();
    });
  }

  function validateWho() {
    const s = state.signer;
    if (state.mode === 'new') {
      if (!s.name || !s.surname) return 'Enter the first name and surname.';
      if (!isValidSaId(s.idNumber)) return 'Enter a valid 13-digit South African ID number.';
      if (!s.dob) return 'Enter the date of birth.';
      if (s.dob > todayIso()) return 'The date of birth cannot be in the future.';
      if (!dateOfBirthMatchesId(s.dob, s.idNumber)) return 'The date of birth does not match the ID number.';
      if (ageOn(s.dob) < AGE_OF_MAJORITY) {
        return 'The person signing must be 18 or older. Register the adult here and add the child as a dependent.';
      }
      if (!isValidStreetAddress(s.street)) return STREET_ADDRESS_MESSAGE;
      if (!s.suburb || !s.city || !s.province) return 'Enter the suburb, city and province.';
    } else {
      const p = existingSigner();
      if (!p) return 'Choose the person who is signing.';
      const dob = p.dateOfBirth || state.extra.dob;
      if (!dob) return 'Enter the date of birth.';
      if (dob > todayIso()) return 'The date of birth cannot be in the future.';
      if (ageOn(dob) < AGE_OF_MAJORITY) return 'The person signing must be 18 or older.';
      if (!p.hasIdNumber) {
        if (!isValidSaId(state.extra.idNumber)) return 'Enter a valid 13-digit South African ID number.';
        if (!dateOfBirthMatchesId(dob, state.extra.idNumber)) return 'The date of birth does not match the ID number.';
      }
    }

    for (const [i, d] of state.dependents.entries()) {
      const who = `Dependent ${i + 1}`;
      if (!d.name || !d.surname) return `${who}: enter the first name and surname.`;
      if (!d.dob) return `${who}: enter the date of birth.`;
      if (d.dob > todayIso()) return `${who}: the date of birth cannot be in the future.`;
      if (d.idNumber) {
        if (!isValidSaId(d.idNumber)) return `${who}: the ID number is not a valid South African ID number.`;
        if (!dateOfBirthMatchesId(d.dob, d.idNumber)) return `${who}: the date of birth does not match the ID number.`;
      }
    }

    if (state.mode === 'existing' && existingSigner().consentStatus === 'VALID' && childrenCovered() === 0) {
      return 'This person already has a consent. To add children, add at least one dependent under 18. '
        + 'Dependents who are 18 or older sign their own consent.';
    }
    return '';
  }

  // ---------- step 2: read the contract, choose, tick one box ----------
  async function stepRead() {
    title.textContent = 'Step 2 of 4 — Please read';
    showError('');
    body.innerHTML = '<p class="muted">Loading the consent form…</p>';

    if (!state.form) {
      try {
        state.form = await getConsentForm(orgId, await getAuthToken());
      } catch (err) {
        body.innerHTML = '<p class="muted">The consent form is not available.</p>';
        showError(err.message || 'Could not load the consent form');
        return;
      }
    }

    const clauses = state.form.clauses;
    const isOptional = (c) => OPTIONAL_TYPES.includes(c.type);
    const isRequired = (c) => c.mandatory && c.type !== 'ANONYMISED_RESEARCH';
    const reading = clauses.filter(c => !isOptional(c));       // read in the scroll box
    const choices = clauses.filter(isOptional);                // switched on or off, default NO
    const required = clauses.filter(isRequired);               // ticked once, at the end

    const clauseText = (c) => `
      <section class="consent-clause">
        ${c.title ? `<h3>${escapeHtml(c.title)}</h3>` : ''}
        <p style="white-space: pre-wrap;">${escapeHtml(c.text)}</p>
      </section>`;

    body.innerHTML = `
      <p class="consent-handover"><strong>Hand the device to the person signing.</strong>
        They must read everything below, make their choices, and tick the box at the end.</p>
      <div class="consent-scroll" id="consent-scroll">${reading.map(clauseText).join('')}</div>
      <p class="muted" id="scroll-hint">Scroll to the end of the text to continue.</p>

      ${choices.length ? `
        <div class="consent-choices">
          <h3>Your choices</h3>
          <p class="muted">These are optional. Saying no does not stop you being considered for help.</p>
          ${choices.map(c => `
            <div class="consent-choice">
              ${c.title ? `<strong>${escapeHtml(c.title)}</strong>` : ''}
              <p style="white-space: pre-wrap;">${escapeHtml(c.text)}</p>
              <label class="consent-check">
                <input type="checkbox" data-optional="${escapeHtml(c.id)}" ${state.acknowledgements[c.id] ? 'checked' : ''}>
                <span>Yes, I agree to this</span>
              </label>
            </div>`).join('')}
        </div>` : ''}

      <div class="consent-final">
        ${required.map(c => `
          <label class="consent-check consent-check-final">
            <input type="checkbox" data-required="${escapeHtml(c.id)}" ${state.acknowledgements[c.id] ? 'checked' : ''}>
            <span>${escapeHtml(c.checkboxLabel || 'I have read this document and I agree to it.')}</span>
          </label>`).join('')}
      </div>
      <div class="consent-actions">
        <button type="button" class="btn" id="back">Back</button>
        <button type="button" class="btn btn-primary" id="next" disabled>Next</button>
      </div>`;

    const scroll = body.querySelector('#consent-scroll');
    const next = body.querySelector('#next');
    const hint = body.querySelector('#scroll-hint');

    const refresh = () => {
      const atEnd = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4;
      const allTicked = required.every(c => state.acknowledgements[c.id]);
      next.disabled = !(atEnd && allTicked);
      hint.textContent = !atEnd
        ? 'Scroll to the end of the text to continue.'
        : (allTicked ? '' : 'Tick the box below to continue.');
    };
    scroll.addEventListener('scroll', refresh);
    body.querySelectorAll('[data-optional], [data-required]').forEach(box => box.addEventListener('change', () => {
      state.acknowledgements[box.dataset.optional || box.dataset.required] = box.checked;
      refresh();
    }));
    refresh();

    body.querySelector('#back').addEventListener('click', stepWho);
    next.addEventListener('click', stepSign);
  }

  // ---------- step 3: sign ----------
  function stepSign() {
    title.textContent = 'Step 3 of 4 — Sign';
    showError('');
    const kids = childrenCovered();
    body.innerHTML = `
      <p><strong>${escapeHtml(signerName())}</strong>, please sign below.</p>
      ${kids ? `
        <div class="form-group"><label for="rel">Your relationship to the ${kids === 1 ? 'child' : 'children'} covered by your signature</label>
          <select id="rel">
            <option value="PARENT" ${state.relationshipToDependents === 'PARENT' ? 'selected' : ''}>Parent</option>
            <option value="LEGAL_GUARDIAN" ${state.relationshipToDependents === 'LEGAL_GUARDIAN' ? 'selected' : ''}>Legal guardian</option>
          </select></div>` : ''}
      <label>Signature: sign with your finger or a mouse</label>
      <canvas id="signature-canvas" class="signature-canvas"></canvas>
      <button type="button" class="text-link" id="clear-signature" style="background:none;border:none;cursor:pointer;">Clear signature</button>
      <div class="consent-actions">
        <button type="button" class="btn" id="back">Back</button>
        <button type="button" class="btn btn-primary" id="next">Next</button>
      </div>`;

    state.pad = createSignaturePad(body.querySelector('#signature-canvas'));
    body.querySelector('#clear-signature').addEventListener('click', () => state.pad.clear());
    body.querySelector('#back').addEventListener('click', stepRead);
    body.querySelector('#next').addEventListener('click', () => {
      if (kids) state.relationshipToDependents = body.querySelector('#rel').value;
      if (state.pad.isEmpty()) return showError('Please sign in the box.');
      state.signature = state.pad.toDataUrl();
      stepWitness();
    });
  }

  // ---------- step 4: the staff member witnesses and submits ----------
  function stepWitness() {
    title.textContent = 'Step 4 of 4 — Staff witness';
    showError('');
    const covered = childrenCovered();
    const adults = newAdults().length;
    body.innerHTML = `
      <p><strong>Hand the device back to the staff member.</strong></p>
      <p>${escapeHtml(signerName())} is signing for themselves${covered ? ` and for ${covered} ${covered === 1 ? 'child' : 'children'}` : ''}.</p>
      ${adults ? `<p class="muted">${adults} adult ${adults === 1 ? 'dependent has' : 'dependents have'} to sign their own consent afterwards.</p>` : ''}
      <img src="${state.signature}" alt="Signature" class="signature-preview">
      <label class="consent-check">
        <input type="checkbox" id="witness-confirmed">
        <span>I am the staff member logged in on this device, and I watched this person read the consent and sign it${covered ? ', and I have checked that they are the parent or legal guardian of the children covered' : ''}.</span>
      </label>
      <div class="consent-actions">
        <button type="button" class="btn" id="back">Back</button>
        <button type="button" class="btn btn-primary" id="submit" disabled>Save signed consent</button>
      </div>`;

    const confirmBox = body.querySelector('#witness-confirmed');
    const submit = body.querySelector('#submit');
    confirmBox.addEventListener('change', () => { submit.disabled = !confirmBox.checked; });
    body.querySelector('#back').addEventListener('click', stepSign);

    submit.addEventListener('click', async () => {
      submit.disabled = true;
      submit.textContent = 'Saving…';
      showError('');
      try {
        const result = await signConsent(orgId, buildPayload(), await getAuthToken());
        stepDone(result);
      } catch (err) {
        console.error(err);
        showError(err.message || 'Could not save the consent');
        submit.disabled = false;
        submit.textContent = 'Save signed consent';
      }
    });
  }

  function buildPayload() {
    const s = state.signer;
    const signer = state.mode === 'new'
      ? {
        newPerson: {
          name: s.name, surname: s.surname, idNumber: s.idNumber, dateOfBirth: s.dob, gender: s.gender || null,
          phoneNumber: s.phone || null, email: s.email || null,
          address: {
            unitNumber: s.unit || null, complexName: s.complex || null,
            streetAddress: normaliseStreetAddress(s.street), suburb: s.suburb, city: s.city, province: s.province
          }
        }
      }
      : {
        personId: state.signerPersonId,
        dateOfBirth: state.extra.dob || null,
        idNumber: state.extra.idNumber || null
      };

    // answers for every clause that takes one (read-only text takes none); unticked means no
    const acknowledgements = {};
    for (const c of state.form.clauses) {
      if (c.type !== 'INFORMATION') acknowledgements[c.id] = !!state.acknowledgements[c.id];
    }

    return {
      formVersionId: state.form.formVersionId,
      signer,
      relationshipToDependents: childrenCovered() ? state.relationshipToDependents : null,
      acknowledgements,
      signaturePng: state.signature,
      witnessConfirmed: true,
      dependents: state.dependents.map(d => ({
        name: d.name, surname: d.surname, dateOfBirth: d.dob, gender: d.gender || null,
        relationship: d.relationship, idNumber: d.idNumber || null
      }))
    };
  }

  function stepDone(result) {
    title.textContent = 'Consent saved';
    showError('');
    const waiting = (result.needsOwnConsentPersonIds || []).length;
    body.innerHTML = `
      <p>The signed consent has been recorded and a sealed copy has been stored.</p>
      ${waiting ? `<p>${waiting} adult ${waiting === 1 ? 'dependent has' : 'dependents have'} been registered but
        must sign their own consent. Use "Capture consent" next to ${waiting === 1 ? 'their name' : 'their names'} in the people list.</p>` : ''}
      <div class="consent-actions">
        <button type="button" class="btn" id="view-pdf">View signed copy (PDF)</button>
        <button type="button" class="btn btn-primary" id="finish">Done</button>
      </div>`;
    body.querySelector('#view-pdf').addEventListener('click', () => openConsentPdf(result.consentId));
    body.querySelector('#finish').addEventListener('click', () => dialog.close());
    onDone(result);
  }

  stepWho();
}
