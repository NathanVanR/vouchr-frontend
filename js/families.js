// js/families.js — families: people an organisation has learned belong together, who can be referred to another
// organisation (e.g. a school refers a family to a local social welfare organisation).
// The receiving organisation sees the family's needs first and its members only after accepting, and only members who
// have a valid consent that allows sharing with partners.
import {
  getFamilies, createFamily, getFamily, updateFamily, changeFamilyMembers, referFamily,
  getReferrals, answerReferral, searchHubOrgs
} from './api.js';
import { getAuthToken, escapeHtml } from './session.js';
import { memberPicker } from './member-picker.js';

const REFERRAL_BADGES = {
  PENDING: '<span class="badge badge-redeemed">Waiting for a reply</span>',
  ACCEPTED: '<span class="badge badge-active">Accepted</span>',
  DECLINED: '<span class="badge badge-expired">Declined</span>',
  CLOSED: '<span class="badge badge-expired">Closed</span>'
};
const CONSENT_LABELS = {
  VALID: 'Consent signed', MISSING: 'No consent yet', WITHDRAWN: 'Consent withdrawn', NEEDS_OWN_CONSENT: 'Needs own consent'
};

let families = [];

/** A small modal built the same way as the consent dialogs. */
function openDialog(titleText, html) {
  const dialog = document.createElement('dialog');
  dialog.className = 'consent-dialog';
  dialog.innerHTML = `
    <div class="consent-header">
      <h2>${escapeHtml(titleText)}</h2>
      <button type="button" class="text-link" data-close>Close</button>
    </div>
    <div data-body>${html}</div>
    <p class="message error" data-error hidden></p>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.showModal();
  const error = dialog.querySelector('[data-error]');
  return {
    dialog,
    body: dialog.querySelector('[data-body]'),
    showError: (text) => { error.textContent = text || ''; error.hidden = !text; }
  };
}

const personName = (p) => `${p.name} ${p.surname}`;

function familyCard(f) {
  const members = (f.members || []).map(m => `
    <li class="family-row">
      <span>${escapeHtml(personName(m))}
        <span class="mp-meta">${m.ageGroup === 'CHILD' ? 'child' : (m.ageGroup === 'ADULT' ? 'adult' : 'age unknown')}${m.school ? `, ${escapeHtml(m.school)}` : ''}
          · ${escapeHtml(CONSENT_LABELS[m.consentStatus] || m.consentStatus)}</span></span>
      <button type="button" class="text-link is-danger" data-action="remove-member" data-family="${escapeHtml(f.familyId)}" data-person="${escapeHtml(m.personId)}">Remove</button>
    </li>`).join('');
  const referrals = (f.referrals || []).map(r => `
    <li class="family-row">
      <span>Referred to <strong>${escapeHtml(r.toOrganizationName)}</strong> ${REFERRAL_BADGES[r.status] || ''}
        ${r.reason ? `<span class="mp-meta">— ${escapeHtml(r.reason)}</span>` : ''}</span>
      ${r.status === 'PENDING' || r.status === 'ACCEPTED'
        ? `<button type="button" class="text-link is-danger" data-action="close-referral" data-referral="${escapeHtml(r.referralId)}">End referral</button>` : ''}
    </li>`).join('');
  const closed = f.status === 'CLOSED';
  return `
    <article class="family-card">
      <h3>${escapeHtml(f.name)} ${closed ? '<span class="badge badge-expired">Closed</span>' : ''}</h3>
      <p>${f.needs ? `<strong>Needs:</strong> ${escapeHtml(f.needs)}` : '<span class="muted">No needs recorded yet.</span>'}</p>
      <ul class="family-list">${members || '<li class="muted">No members yet.</li>'}</ul>
      ${referrals ? `<h4>Referrals</h4><ul class="family-list">${referrals}</ul>` : ''}
      <div class="actions">
        <button type="button" class="text-link" data-action="edit-family" data-family="${escapeHtml(f.familyId)}">Edit</button>
        <button type="button" class="text-link" data-action="add-members" data-family="${escapeHtml(f.familyId)}">Add members</button>
        ${closed ? '' : `<button type="button" class="text-link" data-action="refer" data-family="${escapeHtml(f.familyId)}">Refer to another organisation</button>`}
        <button type="button" class="text-link${closed ? '' : ' is-danger'}" data-action="${closed ? 'reopen' : 'close-family'}" data-family="${escapeHtml(f.familyId)}">${closed ? 'Reopen' : 'Close family'}</button>
      </div>
    </article>`;
}

function incomingRow(r) {
  const actions = r.status === 'PENDING'
    ? `<button type="button" class="text-link" data-action="accept" data-referral="${escapeHtml(r.referralId)}">Accept</button>
       <button type="button" class="text-link is-danger" data-action="decline" data-referral="${escapeHtml(r.referralId)}">Decline</button>`
    : (r.status === 'ACCEPTED'
      ? `<button type="button" class="text-link" data-action="view-referred" data-family="${escapeHtml(r.familyId)}">View family</button>
         <button type="button" class="text-link is-danger" data-action="close-referral" data-referral="${escapeHtml(r.referralId)}">End referral</button>`
      : '');
  return `
    <tr>
      <td>${escapeHtml(r.familyName)}<br><span class="muted">from ${escapeHtml(r.fromOrganizationName)}</span></td>
      <td>${r.familyNeeds ? escapeHtml(r.familyNeeds) : '—'}${r.reason ? `<br><span class="muted">${escapeHtml(r.reason)}</span>` : ''}</td>
      <td>${REFERRAL_BADGES[r.status] || escapeHtml(r.status)}</td>
      <td><div class="actions">${actions}</div></td>
    </tr>`;
}

export async function loadFamilies(orgId) {
  const list = document.getElementById('families-list');
  const incoming = document.getElementById('incoming-referrals');
  list.innerHTML = '<p class="muted">Loading…</p>';
  incoming.innerHTML = '';
  try {
    const token = await getAuthToken();
    const [fams, referrals] = await Promise.all([getFamilies(orgId, token), getReferrals(orgId, 'incoming', token)]);
    families = fams;
    list.innerHTML = fams.length ? fams.map(familyCard).join('') : '<p class="muted">No families yet.</p>';
    incoming.innerHTML = referrals.length
      ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Family</th><th>Needs and reason</th><th>Status</th><th></th></tr></thead>
          <tbody>${referrals.map(incomingRow).join('')}</tbody></table></div>`
      : '<p class="muted">No families have been referred to this organisation.</p>';
  } catch (err) {
    console.error(err);
    list.innerHTML = `<p class="muted">${escapeHtml(err.message || 'Failed to load families.')}</p>`;
  }
}

/**
 * Wires the Families view. getPeopleList returns the organisation's people (already loaded by the People view);
 * refresh reloads both the people and the families.
 */
export function initFamilies({ getOrgId, getPeopleList, refresh, showMessage }) {
  const msg = (text) => showMessage('families-message', text);
  const token = () => getAuthToken();

  document.getElementById('new-family-btn').addEventListener('click', () => newFamilyDialog());

  function peopleWithoutFamily() {
    return getPeopleList().filter(p => !p.familyId);
  }

  const pickPeople = (root) => memberPicker(root, {
    getCandidates: peopleWithoutFamily,
    emptyText: 'Everyone is already in a family.'
  });

  function newFamilyDialog() {
    const { dialog, body, showError } = openDialog('New family', `
      <div class="form-group"><label for="nf-name">Family Surname</label>
        <input type="text" id="nf-name" maxlength="255" placeholder="Dlamini"></div>
      <div class="form-group"><label for="nf-needs">What the family needs (optional)</label>
        <textarea id="nf-needs" rows="3" maxlength="4000"></textarea></div>
      <h3>Members (optional)</h3>
      <div id="nf-members"></div>
      <div class="consent-actions"><button type="button" class="btn btn-primary" id="nf-save">Create family</button></div>`);
    const picker = pickPeople(body.querySelector('#nf-members'));
    body.querySelector('#nf-save').addEventListener('click', async () => {
      const name = body.querySelector('#nf-name').value.trim();
      if (!name) return showError('Enter the family surname.');
      try {
        await createFamily(getOrgId(), {
          name,
          needs: body.querySelector('#nf-needs').value.trim() || null,
          personIds: picker.selectedIds()
        }, await token());
        dialog.close();
        msg('Family created.');
        refresh();
      } catch (err) { showError(err.message || 'Could not create the family'); }
    });
  }

  function editFamilyDialog(family) {
    const { dialog, body, showError } = openDialog('Edit family', `
      <div class="form-group"><label for="ef-name">Family Surname</label>
        <input type="text" id="ef-name" maxlength="255" value="${escapeHtml(family.name)}"></div>
      <div class="form-group"><label for="ef-needs">What the family needs</label>
        <textarea id="ef-needs" rows="4" maxlength="4000">${escapeHtml(family.needs || '')}</textarea></div>
      <div class="consent-actions"><button type="button" class="btn btn-primary" id="ef-save">Save</button></div>`);
    body.querySelector('#ef-save').addEventListener('click', async () => {
      try {
        await updateFamily(family.familyId, {
          name: body.querySelector('#ef-name').value, needs: body.querySelector('#ef-needs').value
        }, await token());
        dialog.close();
        msg('Family saved.');
        refresh();
      } catch (err) { showError(err.message || 'Could not save the family'); }
    });
  }

  function addMembersDialog(family) {
    const { dialog, body, showError } = openDialog(`Add members to ${family.name}`, `
      <div id="am-members"></div>
      <div class="consent-actions"><button type="button" class="btn btn-primary" id="am-save">Add</button></div>`);
    const picker = pickPeople(body.querySelector('#am-members'));
    body.querySelector('#am-save').addEventListener('click', async () => {
      const ids = picker.selectedIds();
      if (!ids.length) return showError('Search for and add at least one person.');
      try {
        await changeFamilyMembers(family.familyId, { add: ids }, await token());
        dialog.close();
        msg('Members added.');
        refresh();
      } catch (err) { showError(err.message || 'Could not add members'); }
    });
  }

  function referDialog(family) {
    const { dialog, body, showError } = openDialog(`Refer ${family.name}`, `
      <p class="muted">The other organisation first sees the family's name and needs. It only sees members after it
        accepts, and only members who have a valid consent that allows sharing with partners.</p>
      <div class="form-group"><label for="rf-search">Find an organisation</label>
        <input type="search" id="rf-search" placeholder="Start typing a name…" autocomplete="off"></div>
      <ul class="search-results" id="rf-results"></ul>
      <p id="rf-chosen" class="muted">No organisation chosen yet.</p>
      <div class="form-group"><label for="rf-reason">Why, and what help is needed (optional)</label>
        <textarea id="rf-reason" rows="3" maxlength="1000"></textarea></div>
      <div class="consent-actions"><button type="button" class="btn btn-primary" id="rf-send" disabled>Send referral</button></div>`);
    let chosen = null;
    let timer = null;
    const results = body.querySelector('#rf-results');
    body.querySelector('#rf-search').addEventListener('input', (e) => {
      clearTimeout(timer);
      const q = e.target.value.trim();
      if (q.length < 2) { results.innerHTML = ''; return; }
      timer = setTimeout(async () => {
        try {
          const orgs = await searchHubOrgs(q, await token());
          results.innerHTML = orgs.map(o => `<li><span>${escapeHtml(o.name)}${o.city ? ` <span class="muted">${escapeHtml(o.city)}</span>` : ''}</span>
            <button type="button" class="btn" data-org="${escapeHtml(o.organizationId)}" data-name="${escapeHtml(o.name)}">Choose</button></li>`).join('')
            || '<li class="muted">No organisations found.</li>';
        } catch (err) { showError(err.message || 'Search failed'); }
      }, 250);
    });
    results.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-org]');
      if (!b) return;
      chosen = b.dataset.org;
      body.querySelector('#rf-chosen').textContent = `Referring to: ${b.dataset.name}`;
      body.querySelector('#rf-send').disabled = false;
    });
    body.querySelector('#rf-send').addEventListener('click', async () => {
      try {
        await referFamily(family.familyId, {
          toOrganizationId: chosen, reason: body.querySelector('#rf-reason').value.trim() || null
        }, await token());
        dialog.close();
        msg('Referral sent.');
        refresh();
      } catch (err) { showError(err.message || 'Could not send the referral'); }
    });
  }

  async function viewReferredFamily(familyId) {
    const { body, showError } = openDialog('Referred family', '<p class="muted">Loading…</p>');
    try {
      const f = await getFamily(familyId, await token());
      body.innerHTML = `
        <h3>${escapeHtml(f.name)} <span class="muted">from ${escapeHtml(f.organizationName)}</span></h3>
        <p>${f.needs ? `<strong>Needs:</strong> ${escapeHtml(f.needs)}` : '<span class="muted">No needs recorded.</span>'}</p>
        <h4>Members you can see</h4>
        <ul>${(f.members || []).map(m => `<li>${escapeHtml(personName(m))}
          <span class="muted">${m.ageGroup === 'CHILD' ? 'child' : (m.ageGroup === 'ADULT' ? 'adult' : '')}${m.school ? `, ${escapeHtml(m.school)}` : ''}</span></li>`).join('')
          || '<li class="muted">None.</li>'}</ul>
        ${f.hiddenMemberCount ? `<p class="muted">${f.hiddenMemberCount} of ${f.memberCount} members are not shown: they have no valid consent, or did not agree to be shared with partner organisations.</p>` : ''}`;
    } catch (err) { body.innerHTML = ''; showError(err.message || 'Could not load the family'); }
  }

  async function act(fn, okText) {
    try {
      await fn();
      if (okText) msg(okText);
      refresh();
    } catch (err) {
      console.error(err);
      msg(err.message || 'Something went wrong');
    }
  }

  document.getElementById('view-families').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-action]');
    if (!b) return;
    const family = families.find(f => f.familyId === b.dataset.family);
    const { action } = b.dataset;

    if (action === 'edit-family') editFamilyDialog(family);
    else if (action === 'add-members') addMembersDialog(family);
    else if (action === 'refer') referDialog(family);
    else if (action === 'view-referred') viewReferredFamily(b.dataset.family);
    else if (action === 'remove-member') {
      act(async () => changeFamilyMembers(b.dataset.family, { remove: [b.dataset.person] }, await token()));
    } else if (action === 'close-family') {
      if (confirm(`Close "${family.name}"? Any open referrals will end and the other organisations lose access.`)) {
        act(async () => updateFamily(family.familyId, { status: 'CLOSED' }, await token()), 'Family closed.');
      }
    } else if (action === 'reopen') {
      act(async () => updateFamily(family.familyId, { status: 'ACTIVE' }, await token()), 'Family reopened.');
    } else if (['accept', 'decline'].includes(action)) {
      act(async () => answerReferral(b.dataset.referral, action, await token()),
        action === 'accept' ? 'Referral accepted.' : 'Referral declined.');
    } else if (action === 'close-referral') {
      if (confirm('End this referral? The other organisation loses access to the family straight away.')) {
        act(async () => answerReferral(b.dataset.referral, 'close', await token()), 'Referral ended.');
      }
    }
  });
}
