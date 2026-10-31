// js/demo-data.js — dummy backend for demo mode. Every API call made through api.js is answered from
// here, so nothing in the demo touches the network. State lives in sessionStorage so it survives
// moving between pages, and disappears when the tab closes or the demo is exited.

const STATE_KEY = 'vouchrDemoState';

export const DEMO_ORG_ID = 'demo-org-1';
const PARTNER_ORG_ID = 'demo-org-2';
const HUB_ID = 'demo-hub-1';

const USER_ROLES = { [DEMO_ORG_ID]: 'ADMIN', 'demo-org-3': 'STAFF' };

const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();

function seed() {
  return {
    seq: 100,
    organizations: {
      [DEMO_ORG_ID]: { name: 'Sunrise Community Trust', hubId: HUB_ID, hubName: 'Cape Flats Relief Network' },
      [PARTNER_ORG_ID]: { name: 'Hope Kitchen Collective', hubId: HUB_ID, hubName: 'Cape Flats Relief Network' },
      'demo-org-3': { name: 'Harbour Food Bank', hubId: null, hubName: null }
    },
    hub: { hubId: HUB_ID, hubName: 'Cape Flats Relief Network', city: 'Cape Town', orgIds: [DEMO_ORG_ID, PARTNER_ORG_ID] },
    searchableOrgs: [
      { organizationId: 'demo-org-4', name: 'Ubuntu Learning Project', city: 'Khayelitsha', alreadyInHub: false },
      { organizationId: 'demo-org-5', name: 'Bright Futures Foundation', city: 'Mitchells Plain', alreadyInHub: false },
      { organizationId: 'demo-org-6', name: 'Table Bay Soup Kitchen', city: 'Cape Town', alreadyInHub: true }
    ],
    projects: [
      { projectId: 'demo-proj-1', organizationId: DEMO_ORG_ID, name: 'Winter feeding scheme', projectType: 'FEEDING_SCHEME',
        description: 'Daily hot meals for learners at three local primary schools.', status: 'ACTIVE', visibility: 'SHARED_WITH_HUB' },
      { projectId: 'demo-proj-2', organizationId: DEMO_ORG_ID, name: 'Reading glasses drive', projectType: 'GLASSES_DRIVE',
        description: 'Eye tests and free reading glasses for pensioners.', status: 'ACTIVE', visibility: 'PRIVATE' },
      { projectId: 'demo-proj-3', organizationId: DEMO_ORG_ID, name: 'Back-to-school supplies 2025', projectType: 'SCHOOL_SUPPLIES_DRIVE',
        description: 'Stationery packs for the start of the school year.', status: 'ARCHIVED', visibility: 'PRIVATE' },
      { projectId: 'demo-proj-4', organizationId: PARTNER_ORG_ID, name: 'Saturday soup run', projectType: 'FEEDING_SCHEME',
        description: 'Community soup kitchen at the Hope Kitchen hall.', status: 'ACTIVE', visibility: 'SHARED_WITH_HUB' }
    ],
    people: [
      person('demo-p-1', 'Thandiwe', 'Mokoena', '1985-03-14', 'F', 'ADULT', 'VALID', 'demo-c-1', true),
      person('demo-p-2', 'Sipho', 'Mokoena', '2014-07-02', 'M', 'CHILD', 'VALID', 'demo-c-1', true, 'demo-p-1', 'CHILD'),
      person('demo-p-3', 'Lerato', 'Mokoena', '2017-11-21', 'F', 'CHILD', 'VALID', 'demo-c-1', true, 'demo-p-1', 'CHILD'),
      person('demo-p-4', 'Johan', 'van der Merwe', '1958-09-05', 'M', 'ADULT', 'VALID', 'demo-c-2', false),
      person('demo-p-5', 'Aisha', 'Patel', '1991-01-30', 'F', 'ADULT', 'MISSING', null, false),
      person('demo-p-6', 'Naledi', 'Dlamini', '1979-06-18', 'F', 'ADULT', 'WITHDRAWN', 'demo-c-3', false),
      person('demo-p-7', 'Bongani', 'Dlamini', '2006-12-01', 'M', 'ADULT', 'NEEDS_OWN_CONSENT', null, false, 'demo-p-6', 'CHILD'),
      // captured with only what the school knew: a child with no parent on record, and a name only
      person('demo-p-8', 'Lwazi', 'Ndlovu', null, 'M', 'CHILD', 'MISSING', null, false, null, null, 'Sunshine Primary'),
      person('demo-p-9', 'Priya', 'Naidoo', null, null, 'UNKNOWN', 'MISSING', null, false)
    ],
    families: [],
    referrals: [],
    beneficiaries: [
      { projectId: 'demo-proj-1', personId: 'demo-p-2', attributes: { school: 'Sunshine Primary' }, createdDate: ago(40) },
      { projectId: 'demo-proj-1', personId: 'demo-p-3', attributes: { school: 'Sunshine Primary' }, createdDate: ago(40) },
      { projectId: 'demo-proj-2', personId: 'demo-p-4', attributes: { prescription: '+1.50 both eyes' }, createdDate: ago(12) }
    ],
    partnerBeneficiaries: [
      { projectId: 'demo-proj-4', personId: 'x-1', name: 'Zanele', surname: 'Khumalo', gender: 'F', attributes: { school: 'Hillcrest Primary' }, createdDate: ago(21) },
      { projectId: 'demo-proj-4', personId: 'x-2', name: 'Pieter', surname: 'Jacobs', gender: 'M', attributes: { school: 'Hillcrest Primary' }, createdDate: ago(9) }
    ],
    operatorHistory: [
      { createdDate: ago(30), changedByName: 'Demo Admin', changedFields: [], changeReason: null,
        legalName: 'Vouchr (Pty) Ltd', registrationNumber: '2025/000000/07', physicalAddress: '1 Example Street, Cape Town, 8001',
        contactDetails: 'privacy@example.org', informationOfficer: 'Demo Information Officer' }
    ]
  };
}

function person(personId, name, surname, dateOfBirth, gender, ageGroup, consentStatus, consentId, sharesWithPartners,
                primaryPersonId = null, relationship = null, school = null) {
  return withMissing({ personId, name, surname, dateOfBirth, gender, ageGroup, consentStatus, consentId, sharesWithPartners,
           primaryPersonId, relationship, school, familyId: null, hasIdNumber: !!dateOfBirth,
           idNumber: null, phoneNumber: null, email: null, address: null });
}

/** Mirrors Person.missingFields() on the server. */
function withMissing(p) {
  const missing = [];
  if (!p.gender) missing.push('gender');
  if (!p.dateOfBirth) missing.push('dateOfBirth');
  if (!p.hasIdNumber) missing.push('idNumber');
  if (!p.phoneNumber) missing.push('phoneNumber');
  if (!p.address || !p.address.streetAddress) missing.push('address');
  if (p.ageGroup === 'CHILD' && !p.school) missing.push('school');
  p.missingFields = missing;
  return p;
}

function load() {
  try {
    const saved = sessionStorage.getItem(STATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* fall through to a fresh dataset */ }
  return seed();
}

function save(state) {
  try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch { /* demo still works for this page */ }
}

/** The organisations the fake staff member belongs to, in the same shape as /api/users/me. */
export function demoUserOrganizations() {
  const { organizations } = load();
  return Object.fromEntries(Object.entries(USER_ROLES).map(([id, role]) => {
    const org = organizations[id];
    return [id, { name: org.name, role, ...(org.hubId && { hubId: org.hubId, hubName: org.hubName }) }];
  }));
}

export function clearDemoState() {
  try { sessionStorage.removeItem(STATE_KEY); } catch { /* ignore */ }
}

// ---------- consent form shown in the capture flow (sample wording, not the real contract) ----------

const CONSENT_FORM = {
  formVersionId: 'demo-form-v1',
  clauses: [
    { id: 'c-intro', type: 'INFORMATION', title: 'About this demo',
      text: 'This is sample wording so you can see how consent capture works. In the real app, the contract is the organisation\'s POPIA consent, read and signed by the person being helped.', mandatory: false },
    { id: 'c-use', type: 'INFORMATION', title: 'How we use your information',
      text: 'We keep your details so the organisation can enrol you in the projects it runs and keep a record of the help you receive. Only authorised staff can see them.', mandatory: false },
    { id: 'c-rights', type: 'INFORMATION', title: 'Your rights',
      text: 'You may ask to see, correct or delete your information, or withdraw this consent at any time, without losing access to other help.\n\n(Keep scrolling: the Continue button unlocks once you reach the end.)\n\n\n\n\nThank you for reading.', mandatory: false },
    { id: 'c-partner', type: 'PARTNER_SHARING', title: 'Sharing with partner organisations',
      text: 'May other organisations in our hub see that you are enrolled in a shared project?', mandatory: false },
    { id: 'c-referrals', type: 'REFERRALS', title: 'Referrals',
      text: 'May we refer you to another organisation that could help you?', mandatory: false },
    { id: 'c-agree', type: 'ACKNOWLEDGEMENT', title: null,
      text: 'I have read and understood this form and I agree to the organisation processing my information as described.', mandatory: true }
  ]
};

// A one-page PDF with a single line of text, built by hand so no file or library is needed.
function demoPdfBlob() {
  const stream = 'BT /F1 22 Tf 72 740 Td (Vouchr demo: sample signed consent) Tj ET\n'
    + 'BT /F1 12 Tf 72 710 Td (This is a placeholder. No real consent was recorded.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => { pdf += `${String(o).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

// ---------- request handling ----------

function notFound(endpoint) {
  throw new Error(`The demo does not support ${endpoint}`);
}

function projectView(state, p) {
  const own = p.organizationId === DEMO_ORG_ID;
  return {
    ...p,
    organizationName: state.organizations[p.organizationId]?.name || '',
    canEdit: own,
    canAdmin: own
  };
}

function nameOf(person) {
  return { name: person.name, surname: person.surname };
}

/** Same contract as api.js request(): resolves with the response body, rejects with an Error. */
export async function demoRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const state = load();
  state.families = state.families || [];
  state.referrals = state.referrals || [];
  const path = endpoint.split('?')[0];
  const query = new URLSearchParams(endpoint.split('?')[1] || '');
  let m;
  let result;

  const nextId = (prefix) => `${prefix}-${++state.seq}`;
  const people = () => state.people;

  // Projects
  if ((m = path.match(/^\/api\/organizations\/([^/]+)\/projects$/))) {
    if (method === 'GET') {
      result = state.projects.filter(p => p.organizationId === m[1]).map(p => projectView(state, p));
    } else {
      const project = { projectId: nextId('demo-proj'), organizationId: m[1], name: body.name, projectType: body.projectType,
        description: body.description, status: 'ACTIVE', visibility: 'PRIVATE' };
      state.projects.push(project);
      result = projectView(state, project);
    }
  } else if ((m = path.match(/^\/api\/projects\/([^/]+)$/))) {
    const project = state.projects.find(p => p.projectId === m[1]);
    if (!project) throw new Error('Project not found');
    if (method === 'PATCH') Object.assign(project, body);
    result = projectView(state, project);
  } else if ((m = path.match(/^\/api\/projects\/([^/]+)\/beneficiaries$/))) {
    const project = state.projects.find(p => p.projectId === m[1]);
    if (!project) throw new Error('Project not found');
    if (method === 'POST') {
      state.beneficiaries.push({ projectId: m[1], personId: body.personId, attributes: body.attributes || {}, createdDate: new Date().toISOString() });
      result = {};
    } else if (project.organizationId === DEMO_ORG_ID) {
      result = state.beneficiaries.filter(b => b.projectId === m[1]).map(b => {
        const p = people().find(x => x.personId === b.personId);
        return { ...b, ...nameOf(p), gender: p.gender, consentStatus: p.consentStatus, registeredByName: 'Demo Admin' };
      });
    } else {
      result = state.partnerBeneficiaries.filter(b => b.projectId === m[1])
        .map(b => ({ ...b, organizationName: state.organizations[project.organizationId].name, registeredByName: 'Partner staff' }));
    }

  // Hubs
  } else if (path === '/api/hub/create-hub' && method === 'POST') {
    const org = state.organizations[body.organizationId];
    state.hub = { hubId: HUB_ID, hubName: body.hubName || org.name, city: body.city || 'Cape Town', orgIds: [body.organizationId] };
    org.hubId = HUB_ID;
    org.hubName = state.hub.hubName;
    result = { hubId: HUB_ID, hubName: state.hub.hubName };
  } else if (path === '/api/hub/search-orgs') {
    const q = (query.get('q') || '').toLowerCase();
    result = state.searchableOrgs.filter(o => o.name.toLowerCase().includes(q));
  } else if ((m = path.match(/^\/api\/hub\/([^/]+)\/projects$/))) {
    result = state.projects.filter(p => p.organizationId !== DEMO_ORG_ID && p.visibility === 'SHARED_WITH_HUB' && state.hub.orgIds.includes(p.organizationId))
      .map(p => projectView(state, p));
  } else if ((m = path.match(/^\/api\/hub\/([^/]+)\/add-org$/))) {
    state.hub.orgIds.push(body.organizationId);
    result = {};
  } else if ((m = path.match(/^\/api\/hub\/([^/]+)\/organizations\/([^/]+)$/)) && method === 'DELETE') {
    state.hub.orgIds = state.hub.orgIds.filter(id => id !== m[2]);
    state.organizations[m[2]].hubId = null;
    state.organizations[m[2]].hubName = null;
    result = {};
  } else if ((m = path.match(/^\/api\/hub\/([^/]+)$/))) {
    result = {
      hubId: state.hub.hubId, hubName: state.hub.hubName, city: state.hub.city,
      organizations: state.hub.orgIds.map(id => ({ organizationId: id, name: state.organizations[id]?.name || 'Partner organisation' }))
    };

  // People & consent
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/people$/))) {
    if (method === 'POST') {
      result = createPerson(state, body);
    } else {
      result = people();
    }
  } else if ((m = path.match(/^\/api\/people\/([^/]+)$/))) {
    const p = people().find(x => x.personId === m[1]);
    if (!p) throw new Error('Person not found');
    if (method === 'PATCH') applyPersonUpdate(p, body);
    result = p;
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/consent-form$/))) {
    result = CONSENT_FORM;
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/consents$/)) && method === 'POST') {
    result = recordConsent(state, body);
  } else if ((m = path.match(/^\/api\/consents\/([^/]+)\/withdraw$/))) {
    people().filter(p => p.consentId === m[1]).forEach(p => { p.consentStatus = 'WITHDRAWN'; });
    result = {};

  // Families & referrals
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/families$/))) {
    if (method === 'POST') {
      const family = { familyId: nextId('demo-f'), organizationId: m[1], organizationName: state.organizations[m[1]].name,
        name: body.name, needs: body.needs || null, status: 'ACTIVE', view: 'OWNER', createdDate: new Date().toISOString() };
      state.families.push(family);
      (body.personIds || []).forEach((id) => { const p = people().find(x => x.personId === id); if (p) p.familyId = family.familyId; });
      result = familyView(state, family);
    } else {
      result = state.families.filter(f => f.organizationId === m[1]).map(f => familyView(state, f));
    }
  } else if ((m = path.match(/^\/api\/families\/([^/]+)$/))) {
    const family = state.families.find(f => f.familyId === m[1]);
    if (!family) throw new Error('Family not found');
    if (method === 'PATCH') {
      Object.assign(family, body);
      if (body.status === 'CLOSED') state.referrals.filter(r => r.familyId === family.familyId).forEach(r => { r.status = 'CLOSED'; });
    }
    result = familyView(state, family);
  } else if ((m = path.match(/^\/api\/families\/([^/]+)\/members$/))) {
    (body.add || []).forEach((id) => { const p = people().find(x => x.personId === id); if (p) p.familyId = m[1]; });
    (body.remove || []).forEach((id) => { const p = people().find(x => x.personId === id); if (p && p.familyId === m[1]) p.familyId = null; });
    result = familyView(state, state.families.find(f => f.familyId === m[1]));
  } else if ((m = path.match(/^\/api\/families\/([^/]+)\/referrals$/)) && method === 'POST') {
    const family = state.families.find(f => f.familyId === m[1]);
    const target = state.searchableOrgs.find(o => o.organizationId === body.toOrganizationId);
    const referral = { referralId: nextId('demo-r'), familyId: family.familyId, familyName: family.name, familyNeeds: family.needs,
      fromOrganizationId: family.organizationId, fromOrganizationName: family.organizationName,
      toOrganizationId: body.toOrganizationId, toOrganizationName: target ? target.name : 'Partner organisation',
      reason: body.reason || null, status: 'PENDING', requestedByName: 'Demo Admin', createdDate: new Date().toISOString() };
    state.referrals.push(referral);
    result = referral;
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/referrals$/))) {
    // nobody else uses the demo, so nothing is ever referred to the demo organisation
    result = query.get('direction') === 'outgoing' ? state.referrals.filter(r => r.fromOrganizationId === m[1]) : [];
  } else if ((m = path.match(/^\/api\/referrals\/([^/]+)\/(accept|decline|close)$/))) {
    const referral = state.referrals.find(r => r.referralId === m[1]);
    referral.status = { accept: 'ACCEPTED', decline: 'DECLINED', close: 'CLOSED' }[m[2]];
    result = referral;

  // Staff & organisations
  } else if (path === '/api/organization/add-staff') {
    result = {};
  } else if (path === '/api/organization') {
    throw new Error('Creating organisations is not available in the demo');

  // Platform settings
  } else if (path === '/api/platform/me') {
    result = { platformAdmin: true };
  } else if (path === '/api/platform/operator-details/history') {
    result = state.operatorHistory;
  } else if (path === '/api/platform/operator-details' && method === 'PUT') {
    const previous = state.operatorHistory[0];
    const changed = Object.keys(body).filter(k => k !== 'changeReason' && body[k] !== previous?.[k]);
    state.operatorHistory.unshift({ ...body, createdDate: new Date().toISOString(), changedByName: 'Demo Admin', changedFields: changed });
    result = {};
  } else {
    notFound(endpoint);
  }

  save(state);
  return result;
}

function ageGroupFrom(dateOfBirth, category) {
  if (dateOfBirth) return Number(new Date().getFullYear()) - Number(dateOfBirth.slice(0, 4)) >= 18 ? 'ADULT' : 'CHILD';
  return category || 'UNKNOWN';
}

function createPerson(state, body) {
  const ageGroup = ageGroupFrom(body.dateOfBirth, body.ageCategory);
  const p = withMissing({
    personId: `demo-p-${++state.seq}`, name: body.name, surname: body.surname, dateOfBirth: body.dateOfBirth || null,
    gender: body.gender || null, ageGroup, consentStatus: 'MISSING', consentId: null, sharesWithPartners: false,
    primaryPersonId: body.primaryPersonId || null, relationship: body.relationship || null, school: body.school || null,
    familyId: null, hasIdNumber: !!body.idNumber, idNumber: body.idNumber || null, phoneNumber: body.phoneNumber || null,
    email: body.email || null, address: body.address || null, ageCategory: body.ageCategory || null
  });
  state.people.push(p);
  return p;
}

function applyPersonUpdate(p, body) {
  ['name', 'surname', 'gender', 'school', 'dateOfBirth', 'phoneNumber', 'email', 'primaryPersonId', 'relationship', 'ageCategory']
    .forEach((k) => { if (body[k] !== undefined && body[k] !== null) p[k] = body[k] === '' ? null : body[k]; });
  if (body.idNumber !== undefined && body.idNumber !== null) {
    p.idNumber = body.idNumber || null;
    p.hasIdNumber = !!body.idNumber;
  }
  if (body.address) {
    const any = Object.values(body.address).some(Boolean);
    p.address = any ? body.address : null;
  }
  p.ageGroup = ageGroupFrom(p.dateOfBirth, p.ageCategory);
  withMissing(p);
}

function familyView(state, family) {
  const members = state.people.filter(p => p.familyId === family.familyId).map(p => ({
    personId: p.personId, name: p.name, surname: p.surname, gender: p.gender, ageGroup: p.ageGroup, school: p.school,
    consentStatus: p.consentStatus, relationship: p.relationship
  }));
  return { ...family, members, memberCount: members.length, hiddenMemberCount: 0,
    referrals: state.referrals.filter(r => r.familyId === family.familyId) };
}

function recordConsent(state, body) {
  const consentId = `demo-c-${++state.seq}`;
  const s = body.signer || {};
  const wantsPartner = Object.entries(body.acknowledgements || {}).some(([id, yes]) => id === 'c-partner' && yes);
  const covered = [];

  if (s.personId) {
    const signer = state.people.find(p => p.personId === s.personId);
    if (s.dateOfBirth) { signer.dateOfBirth = s.dateOfBirth; signer.ageGroup = ageGroupFrom(s.dateOfBirth); }
    if (s.idNumber) { signer.hasIdNumber = true; signer.idNumber = s.idNumber; }
    withMissing(signer);
    if (signer.consentStatus !== 'VALID') {
      signer.consentStatus = 'VALID';
      signer.consentId = consentId;
      signer.sharesWithPartners = wantsPartner;
      covered.push(signer.personId);
    }
  }
  (body.coveredPersonIds || []).forEach((id) => {
    const child = state.people.find(p => p.personId === id);
    if (!child || child.ageGroup !== 'CHILD') throw new Error('Only children under 18 can be covered by someone else');
    child.consentStatus = 'VALID';
    child.consentId = consentId;
    child.sharesWithPartners = wantsPartner;
    covered.push(child.personId);
  });
  if (!covered.length) throw new Error('Nobody is covered by this consent');

  return { consentId, personIds: covered };
}

export async function demoConsentPdf() {
  return demoPdfBlob();
}
