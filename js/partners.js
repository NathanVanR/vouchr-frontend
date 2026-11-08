// js/partners.js — partnerships between organisations, the services each offers, and the care-plan items
// partners have asked this organisation to provide.
// Admins agree partnerships here after agreeing them in real life; staff can only work with partners that exist.
// A partner only ever sees a person's name and the requested service, never anything about their other help.
import {
  getOrgServices, setOrgServices, getPartnerships, proposePartnership, answerPartnership,
  getCarePlanItems, updateCarePlanStatus, checkInCarePlanItem, searchOrgs
} from './api.js';
import { getAuthToken, escapeHtml, SERVICE_LABELS, CARE_STATUS_LABELS, serviceName } from './session.js';

const PARTNERSHIP_BADGES = {
  PENDING: '<span class="badge badge-redeemed">Waiting for a reply</span>',
  ACTIVE: '<span class="badge badge-active">Active</span>',
  DECLINED: '<span class="badge badge-expired">Declined</span>',
  ENDED: '<span class="badge badge-expired">Ended</span>'
};

// What the providing organisation may do next, by current status: [target status, button label]
const NEXT_STEPS = {
  PENDING: [['ATTENDING', 'Accept'], ['DECLINED', 'Decline']],
  ATTENDING: [['LAPSED', 'Lapsed']],
  LAPSED: [['ATTENDING', 'Attending again']]
};

let currentOrgId = null;
let currentIsAdmin = false;
let partnerships = [];

const serviceList = (types) => (types || []).map(t => SERVICE_LABELS[t] || t).join(', ') || 'none listed';

function partnershipRow(p) {
  const weAreRequester = p.requesterOrganizationId === currentOrgId;
  const otherName = weAreRequester ? p.partnerOrganizationName : p.requesterOrganizationName;
  const otherServices = weAreRequester ? p.partnerServices : p.requesterServices;
  const id = escapeHtml(p.partnershipId);
  let actions = '';
  if (currentIsAdmin) {
    if (p.status === 'PENDING' && !weAreRequester) {
      actions = `<button type="button" class="text-link" data-action="accept-partnership" data-id="${id}">Accept</button>
                 <button type="button" class="text-link is-danger" data-action="decline-partnership" data-id="${id}">Decline</button>`;
    } else if (p.status === 'PENDING') {
      actions = `<button type="button" class="text-link is-danger" data-action="end-partnership" data-id="${id}">Withdraw</button>`;
    } else if (p.status === 'ACTIVE') {
      actions = `<button type="button" class="text-link is-danger" data-action="end-partnership" data-id="${id}">End partnership</button>`;
    }
  }
  const note = p.status === 'PENDING'
    ? (weAreRequester ? 'Waiting for their admin' : 'Asked by their admin')
    : '';
  return `
    <tr>
      <td>${escapeHtml(otherName)}<br><span class="muted">Offers: ${escapeHtml(serviceList(otherServices))}</span></td>
      <td>${PARTNERSHIP_BADGES[p.status] || escapeHtml(p.status)}${note ? `<br><span class="muted">${note}</span>` : ''}</td>
      <td><div class="actions">${actions}</div></td>
    </tr>`;
}

function servicesForm(services) {
  const boxes = Object.entries(SERVICE_LABELS).map(([type, label]) => `
    <label class="check-row">
      <input type="checkbox" name="service" value="${type}" ${services.includes(type) ? 'checked' : ''} ${currentIsAdmin ? '' : 'disabled'}>
      ${escapeHtml(label)}
    </label>`).join('');
  return `${boxes}${currentIsAdmin ? '<button type="button" class="btn btn-primary" data-action="save-services" style="margin-top: 0.75rem;">Save services</button>' : ''}`;
}

const checkInText = (item) => item.lastCheckedInAt
  ? `Last check-in: ${new Date(item.lastCheckedInAt).toLocaleString()}${item.lastCheckedInByName ? ` (${item.lastCheckedInByName})` : ''}`
  : 'Not checked in yet';

function incomingCard(item) {
  const who = item.familyId
    ? `${escapeHtml(item.familyName)} family${item.memberNames?.length ? `<br><span class="muted">${item.memberNames.map(escapeHtml).join(', ')}</span>` : ''}`
    : escapeHtml(item.personName || 'A person (no longer shared)');
  const steps = (item.canUpdateStatus ? (NEXT_STEPS[item.status] || []) : []).map(([status, label]) =>
    `<button type="button" class="text-link${status === 'DECLINED' || status === 'LAPSED' ? ' is-danger' : ''}"
       data-action="care-status" data-id="${escapeHtml(item.itemId)}" data-status="${status}">${escapeHtml(label)}</button>`).join('');
  const checkIn = item.canUpdateStatus && item.status === 'ATTENDING'
    ? `<button type="button" class="btn btn-primary btn-sm" data-action="check-in" data-id="${escapeHtml(item.itemId)}">Check in</button>` : '';
  // COMPLETED can no longer be set, but items that already are can still be removed
  const closable = item.canUpdateStatus && ['PENDING', 'ATTENDING', 'LAPSED', 'COMPLETED'].includes(item.status)
    ? `<button type="button" class="text-link is-danger" data-action="care-status" data-id="${escapeHtml(item.itemId)}" data-status="CLOSED">Remove</button>` : '';
  return `
    <article class="family-card">
      <h3>${who}</h3>
      <p class="muted">from ${escapeHtml(item.requestingOrganizationName)}</p>
      <p><strong>${escapeHtml(serviceName(item.serviceType, item.serviceLabel))}</strong>${item.schedule ? ` · ${escapeHtml(item.schedule)}` : ''}
        — ${escapeHtml(CARE_STATUS_LABELS[item.status] || item.status)}</p>
      <p class="muted">${escapeHtml(checkInText(item))}</p>
      <div class="actions">${checkIn}${steps}${closable}</div>
    </article>`;
}

/** Nothing is loaded until the counsellor searches: a busy provider can have thousands of people asked of it. */
async function searchIncoming(term) {
  const box = document.getElementById('incoming-care');
  const q = term.trim();
  if (q.length < 2) {
    box.innerHTML = '<p class="muted">Type at least 2 letters to find someone.</p>';
    return;
  }
  try {
    const items = await getCarePlanItems(currentOrgId, 'incoming', await getAuthToken(), q);
    if (document.getElementById('care-search').value.trim() !== q) return; // a newer search is running
    box.innerHTML = items.length
      ? items.map(incomingCard).join('')
      : '<p class="muted">Nobody found. They may not have been asked of us yet, or may not have agreed to share their details.</p>';
  } catch (err) {
    console.error(err);
    box.innerHTML = `<p class="muted">${escapeHtml(err.message || 'Search failed.')}</p>`;
  }
}

export async function loadPartners(orgId, isAdmin) {
  const orgChanged = orgId !== currentOrgId;
  currentOrgId = orgId;
  currentIsAdmin = isAdmin;
  const servicesBox = document.getElementById('org-services');
  const list = document.getElementById('partnerships-list');
  document.getElementById('propose-partnership-section').style.display = isAdmin ? 'block' : 'none';
  list.innerHTML = '<p class="muted">Loading…</p>';
  if (orgChanged) {
    document.getElementById('care-search').value = '';
    searchIncoming('');
  }
  try {
    const token = await getAuthToken();
    const [services, partners] = await Promise.all([getOrgServices(orgId, token), getPartnerships(orgId, token)]);
    partnerships = partners;
    servicesBox.innerHTML = servicesForm(services);
    const visible = partners.filter(p => p.status === 'PENDING' || p.status === 'ACTIVE');
    list.innerHTML = visible.length
      ? `<div class="table-wrap"><table class="data-table">
          <thead><tr><th>Organisation</th><th>Status</th><th></th></tr></thead>
          <tbody>${visible.map(partnershipRow).join('')}</tbody></table></div>`
      : '<p class="muted">No partners yet. An admin can propose one below once both organisations have agreed to work together.</p>';
  } catch (err) {
    console.error(err);
    list.innerHTML = `<p class="muted">${escapeHtml(err.message || 'Failed to load partners.')}</p>`;
  }
}

export function initPartners({ getOrgId, showMessage }) {
  const msg = (text, type = '') => showMessage('partners-message', text, type);
  const reload = () => loadPartners(getOrgId(), currentIsAdmin);

  // care-plan actions keep the current search on screen instead of reloading the whole tab
  async function act(fn, okText, { reloadAll = true } = {}) {
    try {
      await fn(await getAuthToken());
      msg(okText, 'success');
      if (reloadAll) reload(); else rerunSearch();
    } catch (err) {
      console.error(err);
      msg(err.message || 'Something went wrong', 'error');
    }
  }

  // Find someone who has come to us (nothing is listed until a search)
  let searchTimer = null;
  document.getElementById('care-search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchIncoming(e.target.value), 300);
  });
  const rerunSearch = () => searchIncoming(document.getElementById('care-search').value);

  // Propose a partnership (admins)
  let timer = null;
  const results = document.getElementById('partner-search-results');
  document.getElementById('partner-search').addEventListener('input', (e) => {
    clearTimeout(timer);
    const q = e.target.value.trim();
    if (q.length < 2) { results.innerHTML = ''; return; }
    timer = setTimeout(async () => {
      try {
        const orgs = await searchOrgs(q, await getAuthToken(), currentOrgId);
        results.innerHTML = orgs.map(o => `<li><span>${escapeHtml(o.name)}${o.city ? ` <span class="muted">${escapeHtml(o.city)}</span>` : ''}</span>
          <button type="button" class="btn" data-action="propose" data-org="${escapeHtml(o.organizationId)}">Propose partnership</button></li>`).join('')
          || '<li class="muted">No organisations found.</li>';
      } catch (err) { msg(err.message || 'Search failed', 'error'); }
    }, 250);
  });

  document.getElementById('view-partners').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-action]');
    if (!b) return;
    const { action } = b.dataset;
    if (action === 'propose') {
      act(async (t) => proposePartnership(getOrgId(), b.dataset.org, t), 'Request sent. Their admin needs to accept it.');
      results.innerHTML = '';
      document.getElementById('partner-search').value = '';
    } else if (action === 'accept-partnership') {
      act((t) => answerPartnership(b.dataset.id, 'accept', t), 'Partnership active.');
    } else if (action === 'decline-partnership') {
      act((t) => answerPartnership(b.dataset.id, 'decline', t), 'Request declined.');
    } else if (action === 'end-partnership') {
      if (confirm('End this partnership? Open items handed over through it close and the other organisation loses access straight away.')) {
        act((t) => answerPartnership(b.dataset.id, 'end', t), 'Partnership ended.');
      }
    } else if (action === 'save-services') {
      const checked = [...document.querySelectorAll('#org-services input[name=service]:checked')].map(i => i.value);
      act((t) => setOrgServices(getOrgId(), checked, t), 'Services saved.');
    } else if (action === 'care-status') {
      const { status } = b.dataset;
      if (status === 'CLOSED' && !confirm('Remove this item? It stops counting towards any prerequisite.')) return;
      act((t) => updateCarePlanStatus(b.dataset.id, status, null, t), 'Updated.', { reloadAll: false });
    } else if (action === 'check-in') {
      act((t) => checkInCarePlanItem(b.dataset.id, t), 'Checked in.', { reloadAll: false });
    }
  });
}
