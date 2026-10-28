// js/consent.js — the witnessed, in-person consent flow (staff hands the device to the signer).
import { getConsentForm, signConsent, fetchConsentPdf } from './api.js';
import { getAuthToken, escapeHtml } from './session.js';

const RELATIONSHIPS = [
  ['PARENT', 'Parent'],
  ['LEGAL_GUARDIAN', 'Legal guardian'],
  ['SELF', 'Signing for myself'],
  ['OTHER', 'Other']
];

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

/**
 * @param orgId      organisation the consent is for
 * @param people     the organisation's people (from GET /people); those without a valid consent can be selected
 * @param preselectIds  person ids to tick in step 1
 * @param onDone     called after a successful signing (refresh the caller's lists)
 */
export function openConsentFlow({ orgId, people = [], preselectIds = [], onDone = () => {} }) {
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

  const state = {
    form: null,
    selectedIds: new Set(preselectIds),
    newPeople: [],
    acknowledgements: {},
    signer: { name: '', surname: '', idNumber: '', relationship: 'PARENT' },
    signature: null,
    pad: null
  };

  const showError = (text) => {
    errorEl.textContent = text || '';
    errorEl.hidden = !text;
  };

  const needingConsent = people.filter(p => p.consentStatus !== 'VALID');

  // ---- step 1: who is covered ----
  function stepPeople() {
    title.textContent = 'Step 1 of 4 — Who does this consent cover?';
    showError('');
    if (!state.newPeople.length && !state.selectedIds.size) {
      state.newPeople.push({ name: '', surname: '', gender: '' });
    }

    body.innerHTML = `
      <p class="muted">One signature covers everyone listed here, for every project of this organisation.</p>
      ${needingConsent.length ? `
        <h3>Already registered, consent needed</h3>
        <ul class="consent-list">
          ${needingConsent.map(p => `
            <li><label><input type="checkbox" data-person="${escapeHtml(p.personId)}"
                ${state.selectedIds.has(p.personId) ? 'checked' : ''}>
              ${escapeHtml(p.name)} ${escapeHtml(p.surname)}
              <span class="muted">(${p.consentStatus === 'WITHDRAWN' ? 'consent withdrawn' : 'no consent on file'})</span></label></li>`).join('')}
        </ul>` : ''}
      <h3>New people</h3>
      <div id="new-people"></div>
      <button type="button" class="btn" id="add-person">Add another person</button>
      <div class="consent-actions"><button type="button" class="btn btn-primary" id="next">Next</button></div>`;

    const list = body.querySelector('#new-people');
    const renderNew = () => {
      list.innerHTML = state.newPeople.map((p, i) => `
        <div class="form-row" data-index="${i}">
          <div class="form-group"><label>Name</label><input type="text" maxlength="255" data-field="name" value="${escapeHtml(p.name)}"></div>
          <div class="form-group"><label>Surname</label><input type="text" maxlength="255" data-field="surname" value="${escapeHtml(p.surname)}"></div>
          <div class="form-group"><label>Gender (optional)</label>
            <select data-field="gender">
              <option value="">—</option>
              ${['MALE', 'FEMALE', 'OTHER'].map(g => `<option value="${g}" ${p.gender === g ? 'selected' : ''}>${g[0] + g.slice(1).toLowerCase()}</option>`).join('')}
            </select></div>
        </div>`).join('');
    };
    renderNew();

    list.addEventListener('input', (e) => {
      const row = e.target.closest('[data-index]');
      if (row) state.newPeople[Number(row.dataset.index)][e.target.dataset.field] = e.target.value;
    });
    body.querySelectorAll('[data-person]').forEach(box => box.addEventListener('change', () => {
      if (box.checked) state.selectedIds.add(box.dataset.person); else state.selectedIds.delete(box.dataset.person);
    }));
    body.querySelector('#add-person').addEventListener('click', () => {
      state.newPeople.push({ name: '', surname: '', gender: '' });
      renderNew();
    });
    body.querySelector('#next').addEventListener('click', () => {
      state.newPeople = state.newPeople.filter(p => p.name.trim() || p.surname.trim());
      if (state.newPeople.some(p => !p.name.trim() || !p.surname.trim())) {
        showError('Every new person needs a name and a surname.');
        return;
      }
      if (!state.newPeople.length && !state.selectedIds.size) {
        showError('Add or select at least one person.');
        return;
      }
      stepRead();
    });
  }

  // ---- step 2: the signer reads the contract ----
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
    const isRequired = (c) => c.mandatory && c.type !== 'ANONYMISED_RESEARCH';

    const clauseHtml = (c) => {
      const checked = state.acknowledgements[c.id] ? 'checked' : '';
      const box = (label) => `
        <label class="consent-check">
          <input type="checkbox" data-clause="${escapeHtml(c.id)}" ${checked}>
          <span>${label}</span>
        </label>`;

      if (c.type === 'INFORMATION') {
        return `
          <section class="consent-clause">
            ${c.title ? `<h3>${escapeHtml(c.title)}</h3>` : ''}
            <p style="white-space: pre-wrap;">${escapeHtml(c.text)}</p>
          </section>`;
      }
      if (c.type === 'DATA_CATEGORY') {
        return `<div class="consent-category">${box(escapeHtml(c.text))}</div>`;
      }
      return `
        <section class="consent-clause">
          ${c.title ? `<h3>${escapeHtml(c.title)}</h3>` : ''}
          <p style="white-space: pre-wrap;">${escapeHtml(c.text)}</p>
          ${box(`I agree${isRequired(c) ? '' : ' <span class="muted">(optional)</span>'}`)}
        </section>`;
    };

    body.innerHTML = `
      <p class="consent-handover"><strong>Hand the device to the person signing.</strong>
        They must read everything below. Scroll to the end to continue.</p>
      <div class="consent-scroll" id="consent-scroll">
        ${clauses.map(clauseHtml).join('')}
      </div>
      <p class="muted" id="scroll-hint">Scroll to the end to continue.</p>
      <div class="consent-actions">
        <button type="button" class="btn" id="back">Back</button>
        <button type="button" class="btn btn-primary" id="next" disabled>Next</button>
      </div>`;

    const scroll = body.querySelector('#consent-scroll');
    const next = body.querySelector('#next');
    const refresh = () => {
      const atEnd = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 4;
      const allAccepted = clauses.every(c => !isRequired(c) || state.acknowledgements[c.id]);
      next.disabled = !(atEnd && allAccepted);
      body.querySelector('#scroll-hint').textContent = !atEnd
        ? 'Scroll to the end to continue.'
        : (allAccepted ? '' : 'Tick "I agree" on every required item to continue.');
    };
    scroll.addEventListener('scroll', refresh);
    body.querySelectorAll('[data-clause]').forEach(box => box.addEventListener('change', () => {
      state.acknowledgements[box.dataset.clause] = box.checked;
      refresh();
    }));
    refresh();

    body.querySelector('#back').addEventListener('click', stepPeople);
    next.addEventListener('click', stepSign);
  }

  // ---- step 3: signer details + signature ----
  function stepSign() {
    title.textContent = 'Step 3 of 4 — Sign';
    showError('');
    body.innerHTML = `
      <div class="form-row">
        <div class="form-group"><label for="signer-name">Name</label>
          <input type="text" id="signer-name" maxlength="255" value="${escapeHtml(state.signer.name)}"></div>
        <div class="form-group"><label for="signer-surname">Surname</label>
          <input type="text" id="signer-surname" maxlength="255" value="${escapeHtml(state.signer.surname)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label for="signer-id">South African ID number</label>
          <input type="text" id="signer-id" inputmode="numeric" maxlength="13" value="${escapeHtml(state.signer.idNumber)}"></div>
        <div class="form-group"><label for="signer-relationship">Relationship to the people covered</label>
          <select id="signer-relationship">
            ${RELATIONSHIPS.map(([v, l]) => `<option value="${v}" ${state.signer.relationship === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
      </div>
      <label>Signature — sign with your finger or a mouse</label>
      <canvas id="signature-canvas" class="signature-canvas"></canvas>
      <button type="button" class="text-link" id="clear-signature" style="background:none;border:none;cursor:pointer;">Clear signature</button>
      <div class="consent-actions">
        <button type="button" class="btn" id="back">Back</button>
        <button type="button" class="btn btn-primary" id="next">Next</button>
      </div>`;

    state.pad = createSignaturePad(body.querySelector('#signature-canvas'));
    body.querySelector('#clear-signature').addEventListener('click', () => state.pad.clear());

    const save = () => {
      state.signer = {
        name: body.querySelector('#signer-name').value.trim(),
        surname: body.querySelector('#signer-surname').value.trim(),
        idNumber: body.querySelector('#signer-id').value.trim(),
        relationship: body.querySelector('#signer-relationship').value
      };
    };
    body.querySelector('#back').addEventListener('click', () => { save(); stepRead(); });
    body.querySelector('#next').addEventListener('click', () => {
      save();
      if (!state.signer.name || !state.signer.surname) return showError('Please enter your name and surname.');
      if (!/^\d{13}$/.test(state.signer.idNumber)) return showError('Please enter a 13-digit South African ID number.');
      if (state.pad.isEmpty()) return showError('Please sign in the box.');
      state.signature = state.pad.toDataUrl();
      stepWitness();
    });
  }

  // ---- step 4: the staff member witnesses and submits ----
  function stepWitness() {
    title.textContent = 'Step 4 of 4 — Staff witness';
    showError('');
    const count = state.selectedIds.size + state.newPeople.length;
    body.innerHTML = `
      <p><strong>Hand the device back to the staff member.</strong></p>
      <p>${escapeHtml(state.signer.name)} ${escapeHtml(state.signer.surname)} is signing for ${count} ${count === 1 ? 'person' : 'people'}.</p>
      <img src="${state.signature}" alt="Signature" class="signature-preview">
      <label class="consent-check">
        <input type="checkbox" id="witness-confirmed">
        I am the staff member logged in on this device, and I watched this person read the consent and sign it.
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
        const result = await signConsent(orgId, {
          formVersionId: state.form.formVersionId,
          signerName: state.signer.name,
          signerSurname: state.signer.surname,
          signerIdNumber: state.signer.idNumber,
          relationship: state.signer.relationship,
          acknowledgements: state.acknowledgements,
          signaturePng: state.signature,
          witnessConfirmed: true,
          newPeople: state.newPeople.map(p => ({ name: p.name.trim(), surname: p.surname.trim(), gender: p.gender || null })),
          existingPersonIds: [...state.selectedIds]
        }, await getAuthToken());
        stepDone(result);
      } catch (err) {
        console.error(err);
        showError(err.message || 'Could not save the consent');
        submit.disabled = false;
        submit.textContent = 'Save signed consent';
      }
    });
  }

  function stepDone(result) {
    title.textContent = 'Consent saved';
    showError('');
    body.innerHTML = `
      <p>The signed consent has been recorded and a sealed copy has been stored.</p>
      <div class="consent-actions">
        <button type="button" class="btn" id="view-pdf">View signed copy (PDF)</button>
        <button type="button" class="btn btn-primary" id="finish">Done</button>
      </div>`;
    body.querySelector('#view-pdf').addEventListener('click', () => openConsentPdf(result.consentId));
    body.querySelector('#finish').addEventListener('click', () => dialog.close());
    onDone(result);
  }

  stepPeople();
}
