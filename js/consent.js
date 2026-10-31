// js/consent.js — staff-only witnessed consent, on one device. People are added separately (person-form.js):
//   1. who signs (a registered adult, or a guardian who is not registered) and which children are covered
//   2. the signer reads the contract, makes the optional choices, ticks ONE box
//   3. the signer signs
//   4. the staff member confirms they witnessed it
import { getConsentForm, signConsent, fetchConsentPdf } from './api.js';
import { getAuthToken, escapeHtml } from './session.js';
import { memberPicker } from './member-picker.js';
import { isValidSaId, dateOfBirthFromSaId, dateOfBirthMatchesId, ageOn, AGE_OF_MAJORITY } from './utils.js';

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
const blankGuardian = () => ({ name: '', surname: '', idNumber: '', dob: '' });

/**
 * Consent is captured separately from adding a person, so everyone it covers is already registered.
 *
 * @param orgId           organisation the consent is for
 * @param people          the organisation's people (from GET /people)
 * @param signerPersonId  optional: open with this registered adult as the signer
 * @param coverPersonIds  optional: children to tick as covered by this signature
 * @param onDone          called after a successful signing (refresh the caller's lists)
 */
export function openConsentFlow({ orgId, people = [], signerPersonId = null, coverPersonIds = [], onDone = () => {} }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'consent-dialog';
  dialog.innerHTML = `
    <div class="consent-header">
      <h2 id="consent-title"></h2>
      <button type="button" class="text-link" id="consent-cancel">Cancel</button>
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
  const needsCover = (p) => p.ageGroup === 'CHILD' && p.consentStatus !== 'VALID';
  const state = {
    mode: signerPersonId && eligible.some(p => p.personId === signerPersonId) ? 'existing'
      : (eligible.length ? 'existing' : 'guardian'),
    signerPersonId: signerPersonId || (eligible[0] && eligible[0].personId) || null,
    guardian: blankGuardian(),
    extra: { dob: '', idNumber: '' },        // for a registered signer whose record lacks them
    covered: new Set(coverPersonIds.filter(id => people.some(p => p.personId === id && needsCover(p)))),
    form: null,
    acknowledgements: {},
    relationshipToDependents: 'PARENT',
    signature: null,
    pad: null
  };
  // opened for a child with no adult chosen: prefer their registered parent, otherwise a guardian entered here
  if (!signerPersonId && state.covered.size) {
    const first = people.find(p => state.covered.has(p.personId));
    const parent = first && eligible.find(p => p.personId === first.primaryPersonId);
    if (parent) {
      state.signerPersonId = parent.personId;
    } else {
      state.mode = 'guardian';
    }
  }

  const showError = (text) => {
    errorEl.textContent = text || '';
    errorEl.hidden = !text;
  };

  const existingSigner = () => people.find(p => p.personId === state.signerPersonId) || null;
  const signerName = () => state.mode === 'guardian'
    ? `${state.guardian.name} ${state.guardian.surname}`.trim()
    : (existingSigner() ? `${existingSigner().name} ${existingSigner().surname}` : '');
  /** A registered signer without a valid consent signs for themselves too. */
  const signsForSelf = () => state.mode === 'existing' && !!existingSigner() && existingSigner().consentStatus !== 'VALID';
  const coveredChildren = () => people.filter(p => state.covered.has(p.personId) && p.personId !== state.signerPersonId);
  const childrenCovered = () => coveredChildren().length;

  // ---------- step 1: who signs, and who is covered ----------
  function stepWho() {
    title.textContent = 'Step 1 of 4 — Who signs?';
    showError('');
    const g = state.guardian;
    const input = (id, label, value, attrs = '') => `
      <div class="form-group"><label for="${id}">${label}</label>
        <input type="text" id="${id}" value="${escapeHtml(value)}" ${attrs}></div>`;

    body.innerHTML = `
      <p class="muted">Every adult (18 or older) signs their own consent. A parent or legal guardian's signature also
        covers children under 18. A child with no parent on record can be covered by a guardian who is not registered.</p>

      <div class="consent-mode">
        <label><input type="radio" name="mode" value="existing" ${state.mode === 'existing' ? 'checked' : ''}
          ${eligible.length ? '' : 'disabled'}> A registered adult</label>
        <label><input type="radio" name="mode" value="guardian" ${state.mode === 'guardian' ? 'checked' : ''}> A guardian who is not registered</label>
      </div>

      <div id="who-existing" ${state.mode === 'existing' ? '' : 'hidden'}>
        <div class="form-group"><label for="e-person">Person</label>
          <select id="e-person">
            ${eligible.map(p => `<option value="${escapeHtml(p.personId)}" ${p.personId === state.signerPersonId ? 'selected' : ''}>
              ${escapeHtml(p.name)} ${escapeHtml(p.surname)}${p.consentStatus === 'VALID' ? ' (has a consent: add children)' : ''}</option>`).join('')}
          </select></div>
        <div id="e-extra"></div>
      </div>

      <div id="who-guardian" ${state.mode === 'guardian' ? '' : 'hidden'}>
        <div class="form-row">
          ${input('g-name', 'First name', g.name, 'maxlength="255" autocomplete="off"')}
          ${input('g-surname', 'Surname', g.surname, 'maxlength="255" autocomplete="off"')}
        </div>
        <div class="form-row">
          ${input('g-id', 'South African ID number', g.idNumber, 'inputmode="numeric" maxlength="13"')}
          <div class="form-group"><label for="g-dob">Date of birth (optional)</label>
            <input type="date" id="g-dob" value="${escapeHtml(g.dob)}" max="${todayIso()}"></div>
        </div>
        <p class="muted">Their name and ID number are kept on the signed consent only; they are not added as a person.</p>
      </div>

      <h3>Children covered by this signature</h3>
      <p class="muted">Search for each child this person is signing for. Add as many as needed.</p>
      <div id="covered"></div>
      <div class="consent-actions"><button type="button" class="btn btn-primary" id="next">Next</button></div>`;

    const get = (id) => body.querySelector('#' + id);

    const coveredPicker = memberPicker(get('covered'), {
      getCandidates: () => people.filter(p => needsCover(p) && p.personId !== state.signerPersonId),
      selected: state.covered,
      emptyText: 'No children are waiting for a consent. Add a child first, then capture consent for them.',
      placeholder: 'Search children by name or school…'
    });
    const renderCovered = () => coveredPicker.refresh();

    // registered signer: ask only for what the record lacks
    const renderExisting = () => {
      const p = existingSigner();
      const extra = get('e-extra');
      if (!p) { extra.innerHTML = ''; return; }
      extra.innerHTML = `
        ${p.ageGroup === 'UNKNOWN' ? `<div class="form-group"><label for="e-dob">Date of birth</label>
          <input type="date" id="e-dob" value="${escapeHtml(state.extra.dob)}" max="${todayIso()}"></div>` : ''}
        ${!p.hasIdNumber ? `<div class="form-group"><label for="e-id">South African ID number</label>
          <input type="text" id="e-id" inputmode="numeric" maxlength="13" value="${escapeHtml(state.extra.idNumber)}"></div>` : ''}`;
    };
    renderExisting();
    renderCovered();
    get('e-person').addEventListener('change', () => {
      collect();
      state.signerPersonId = get('e-person').value;
      state.covered.delete(state.signerPersonId);
      renderExisting();
      renderCovered();
    });

    get('g-id').addEventListener('input', () => {
      const dob = dateOfBirthFromSaId(get('g-id').value.trim());
      if (dob && !get('g-dob').value) get('g-dob').value = dob;
    });

    body.querySelectorAll('input[name="mode"]').forEach(radio => radio.addEventListener('change', () => {
      collect();
      state.mode = radio.value;
      get('who-existing').hidden = state.mode !== 'existing';
      get('who-guardian').hidden = state.mode !== 'guardian';
      renderExisting();
      renderCovered();
    }));

    function collect() {
      const val = (id) => (get(id) ? get(id).value.trim() : '');
      Object.assign(state.guardian, { name: val('g-name'), surname: val('g-surname'), idNumber: val('g-id'), dob: val('g-dob') });
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
    if (state.mode === 'guardian') {
      const g = state.guardian;
      if (!g.name || !g.surname) return 'Enter the guardian\'s first name and surname.';
      if (!isValidSaId(g.idNumber)) return 'Enter a valid 13-digit South African ID number.';
      const dob = g.dob || dateOfBirthFromSaId(g.idNumber);
      if (dob > todayIso()) return 'The date of birth cannot be in the future.';
      if (!dateOfBirthMatchesId(dob, g.idNumber)) return 'The date of birth does not match the ID number.';
      if (ageOn(dob) < AGE_OF_MAJORITY) return 'The person signing must be 18 or older.';
      if (!childrenCovered()) return 'Tick the children this guardian is signing for.';
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
      if (!signsForSelf() && !childrenCovered()) {
        return 'This person already has a consent. To add children, tick at least one child under 18. '
          + 'Other adults sign their own consent.';
      }
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
      <button type="button" class="text-link" id="clear-signature">Clear signature</button>
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
    const forSelf = signsForSelf();
    const childText = `${covered} ${covered === 1 ? 'child' : 'children'}`;
    body.innerHTML = `
      <p><strong>Hand the device back to the staff member.</strong></p>
      <p>${escapeHtml(signerName())} is signing ${forSelf ? 'for themselves' : ''}${forSelf && covered ? ' and ' : ''}${covered ? `for ${childText}` : ''}.</p>
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
    const g = state.guardian;
    const signer = state.mode === 'guardian'
      ? { guardian: { name: g.name, surname: g.surname, idNumber: g.idNumber, dateOfBirth: g.dob || null } }
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
      coveredPersonIds: coveredChildren().map(p => p.personId),
      relationshipToDependents: childrenCovered() ? state.relationshipToDependents : null,
      acknowledgements,
      signaturePng: state.signature,
      witnessConfirmed: true
    };
  }

  function stepDone(result) {
    title.textContent = 'Consent saved';
    showError('');
    body.innerHTML = `
      <p>The signed consent has been recorded and a sealed copy has been stored.
        ${(result.personIds || []).length === 1 ? 'It covers 1 person.' : `It covers ${(result.personIds || []).length} people.`}</p>
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
