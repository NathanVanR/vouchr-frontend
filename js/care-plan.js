// js/care-plan.js — the care plan dialog for a family or for one person.
// A care plan is the services someone gets from us or from partner organisations. Staff can only pick partners that
// admins have set up, and only services those partners say they offer. A partner is only told the name(s) of people
// whose consent allows sharing, and the service asked for; it updates the status as they attend.
//
// A person who belongs to a family sees the family's plan too (read-only here: it is managed on the Families tab and
// applies to everyone in the family), plus their own items, which only apply to them.
import {
  getFamily, getFamilyCarePlan, addFamilyCarePlanItem, getPersonCarePlan, addPersonCarePlanItem,
  updateCarePlanStatus, getPartnerships, getOrgServices
} from './api.js';
import { getAuthToken, escapeHtml, SERVICE_LABELS, CARE_STATUS_LABELS } from './session.js';
import { openDialog } from './dialog.js';

const OPEN_STATUSES = ['PENDING', 'ATTENDING', 'LAPSED'];

const checkInLabel = (i) => i.lastCheckedInAt
  ? `last check-in ${new Date(i.lastCheckedInAt).toLocaleDateString()}`
  : 'not checked in yet';

function itemRow(i, { closable }) {
  return `
    <li class="care-item">
      <span><strong>${escapeHtml(SERVICE_LABELS[i.serviceType] || i.serviceType)}</strong>
        — ${i.internal ? 'us' : escapeHtml(i.providerOrganizationName)}
        <span class="mp-meta">${escapeHtml(CARE_STATUS_LABELS[i.status] || i.status)}${i.schedule ? ` · ${escapeHtml(i.schedule)}` : ''}
          · ${escapeHtml(checkInLabel(i))}</span></span>
      ${closable && (OPEN_STATUSES.includes(i.status) || i.status === 'COMPLETED')
        ? `<button type="button" class="text-link is-danger" data-close-item="${escapeHtml(i.itemId)}">Remove</button>` : ''}
    </li>`;
}

/**
 * @param orgId   the organisation whose staff are using the dialog
 * @param subject { kind: 'family', id, name }
 *              | { kind: 'person', id, name, familyId? }   (familyId: the family the person belongs to, if any)
 */
export async function openCarePlanDialog({ orgId, subject }) {
  const isFamily = subject.kind === 'family';
  const { body, showError } = openDialog(`Care plan for ${subject.name}`, '<p class="muted">Loading…</p>');
  const familyId = isFamily ? subject.id : subject.familyId || null;

  async function render() {
    try {
      const t = await getAuthToken();
      const [own, familyItems, partnerships, ownServices, family] = await Promise.all([
        isFamily ? getFamilyCarePlan(subject.id, t) : getPersonCarePlan(subject.id, t),
        !isFamily && familyId ? getFamilyCarePlan(familyId, t) : Promise.resolve([]),
        getPartnerships(orgId, t),
        getOrgServices(orgId, t),
        !isFamily && familyId ? getFamily(familyId, t) : Promise.resolve(null)
      ]);

      const options = ownServices.map(type => ({ orgId, type, label: `${SERVICE_LABELS[type] || type} — us` }));
      partnerships.filter(p => p.status === 'ACTIVE').forEach(p => {
        const weAreRequester = p.requesterOrganizationId === orgId;
        const partnerId = weAreRequester ? p.partnerOrganizationId : p.requesterOrganizationId;
        const partnerName = weAreRequester ? p.partnerOrganizationName : p.requesterOrganizationName;
        (weAreRequester ? p.partnerServices : p.requesterServices).forEach(type =>
          options.push({ orgId: partnerId, type, label: `${SERVICE_LABELS[type] || type} — ${partnerName}` }));
      });
      // flag what the family already gets, so staff don't add it a second time for one member
      const onFamilyPlan = (o) => familyItems.some(i => OPEN_STATUSES.includes(i.status)
        && i.serviceType === o.type && i.providerOrganizationId === o.orgId);

      const familySection = !isFamily && familyId ? `
        <h3>Family care plan${family ? ` — ${escapeHtml(family.name)}` : ''}</h3>
        <p class="muted">Applies to everyone in the family. Change it on the Families tab.</p>
        <ul class="family-list">${familyItems.map(i => itemRow(i, { closable: false })).join('')
          || '<li class="muted">Nothing on the family plan yet.</li>'}</ul>` : '';

      body.innerHTML = `
        <p class="muted">${isFamily
          ? 'Services this family gets from us or from partner organisations.'
          : 'Services this person gets from us or from partner organisations. A partner can only be given someone whose consent allows sharing with partners.'}
          Some projects only accept people who are attending a service.</p>
        ${familySection}
        <h3>${isFamily ? 'Care plan' : `${escapeHtml(subject.name)}'s own care plan`}</h3>
        <ul class="family-list">${own.map(i => itemRow(i, { closable: true })).join('')
          || '<li class="muted">Nothing on the plan yet.</li>'}</ul>
        <h3>Add a service</h3>
        ${options.length ? `
          <div class="form-group"><label for="cp-service">Service and provider</label>
            <select id="cp-service">${options.map((o, n) =>
              `<option value="${n}">${escapeHtml(o.label)}${onFamilyPlan(o) ? ' (already on the family plan)' : ''}</option>`).join('')}</select></div>
          <div class="form-group"><label for="cp-schedule">When (optional)</label>
            <input type="text" id="cp-schedule" maxlength="500" placeholder="e.g. Tuesdays 18:00"></div>
          <div class="consent-actions"><button type="button" class="btn btn-primary" id="cp-add">Add to plan</button></div>`
          : '<p class="muted">No services are available yet. An admin can set what we offer and add partners on the Partners tab.</p>'}`;
      showError('');

      body.querySelectorAll('[data-close-item]').forEach(btn => btn.addEventListener('click', async () => {
        try {
          await updateCarePlanStatus(btn.dataset.closeItem, 'CLOSED', null, await getAuthToken());
          render();
        } catch (err) { showError(err.message || 'Could not remove the item'); }
      }));
      const add = body.querySelector('#cp-add');
      if (add) add.addEventListener('click', async () => {
        const chosen = options[Number(body.querySelector('#cp-service').value)];
        const payload = {
          providerOrganizationId: chosen.orgId,
          serviceType: chosen.type,
          schedule: body.querySelector('#cp-schedule').value.trim() || null
        };
        try {
          const token = await getAuthToken();
          await (isFamily ? addFamilyCarePlanItem(subject.id, payload, token) : addPersonCarePlanItem(subject.id, payload, token));
          render();
        } catch (err) { showError(err.message || 'Could not add the service'); }
      });
    } catch (err) { body.innerHTML = ''; showError(err.message || 'Could not load the care plan'); }
  }
  render();
}
