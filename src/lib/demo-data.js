// js/demo-data.js — dummy backend for demo mode. Every API call made through api.js is answered from
// here, so nothing in the demo touches the network. State lives in sessionStorage so it survives
// moving between pages, and disappears when the tab closes or the demo is exited.

const STATE_KEY = 'vouchrDemoState';

export const DEMO_ORG_ID = 'demo-org-1';
const PARTNER_ORG_ID = 'demo-org-2';

const USER_ROLES = { [DEMO_ORG_ID]: 'ADMIN', 'demo-org-3': 'STAFF' };

const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();

function seed() {
  return {
    seq: 100,
    organizations: {
      [DEMO_ORG_ID]: { name: 'Sunrise Community Trust' },
      [PARTNER_ORG_ID]: { name: 'Hope Kitchen Collective' },
      'demo-org-3': { name: 'Harbour Food Bank' }
    },
    searchableOrgs: [
      { organizationId: 'demo-org-4', name: 'Ubuntu Learning Project', city: 'Khayelitsha' },
      { organizationId: 'demo-org-5', name: 'Bright Futures Foundation', city: 'Mitchells Plain' },
      { organizationId: 'demo-org-6', name: 'Table Bay Soup Kitchen', city: 'Cape Town' }
    ],
    projects: [
      { projectId: 'demo-proj-1', organizationId: DEMO_ORG_ID, name: 'Winter feeding scheme', projectType: 'FEEDING_SCHEME',
        description: 'Daily hot meals for learners at three local primary schools.', status: 'ACTIVE', startsOn: inDays(-20), endsOn: inDays(40) },
      { projectId: 'demo-proj-2', organizationId: DEMO_ORG_ID, name: 'Reading glasses drive', projectType: 'GLASSES_DRIVE', mode: 'BOTH',
        description: 'Eye tests and free reading glasses for pensioners.', status: 'ACTIVE', startsOn: inDays(10), endsOn: inDays(24) },
      { projectId: 'demo-proj-3', organizationId: DEMO_ORG_ID, name: 'Back-to-school supplies 2025', projectType: 'SCHOOL_SUPPLIES_DRIVE',
        description: 'Stationery packs for the start of the school year.', status: 'ARCHIVED' },
      { projectId: 'demo-proj-4', organizationId: PARTNER_ORG_ID, name: 'Saturday soup run', projectType: 'FEEDING_SCHEME',
        description: 'Community soup kitchen at the Hope Kitchen hall.', status: 'ACTIVE' }
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
    return [id, { name: org.name, role }];
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
      text: 'May partner organisations working with us on a project see that you are enrolled in it?', mandatory: false },
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

// The demo organisation owns most projects and has joined one run by its partner (view only here).
function projectView(state, p) {
  const own = p.organizationId === DEMO_ORG_ID;
  return {
    ...p,
    mode: p.mode || 'DISTRIBUTE',
    openHandout: !!p.openHandout,
    organizationName: state.organizations[p.organizationId]?.name || '',
    canEdit: own,
    participant: !own,
    canAdmin: own
  };
}

function demoStock(state, item) {
  const received = state.receipts.filter(r => r.stockItemId === item.stockItemId).reduce((n, r) => n + (r.quantity || 0), 0);
  const given = state.handouts.filter(h => h.stockItemId === item.stockItemId).reduce((n, h) => n + h.quantity, 0);
  return { ...item, received, given, onHand: received - given };
}

function demoHandout(state, h) {
  const person = h.personId ? state.people.find(x => x.personId === h.personId) : null;
  return { ...h, projectName: state.projects.find(p => p.projectId === h.projectId)?.name || '',
    organizationName: state.organizations[h.organizationId].name, personName: person ? `${person.name} ${person.surname}` : null,
    stockItemName: state.stockItems.find(i => i.stockItemId === h.stockItemId)?.name || null, canDelete: true };
}

function recordCareEvent(state, item, eventType, { fromStatus = null, toStatus = null, note = null, nextId }) {
  state.careEvents.push({
    eventId: nextId('demo-ev'), itemId: item.itemId, serviceType: item.serviceType, serviceLabel: item.serviceLabel || null,
    familyName: item.familyName || null, requestingOrganizationName: item.requestingOrganizationName,
    providerOrganizationName: item.providerOrganizationName, internal: item.internal, eventType, fromStatus, toStatus, note,
    actedByName: 'Demo Admin', actedByOrganizationName: state.organizations[DEMO_ORG_ID].name, occurredAt: new Date().toISOString()
  });
}

/** A "YYYY-MM-DD" date this many days from today, in local time. */
function inDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Where an organisation is: the demo organisation sits in Cape Town, the others come from the area list. */
function orgPlace(state, id) {
  return state.areaOrgs.find(o => o.organizationId === id) || { city: 'Cape Town', suburb: 'Woodstock' };
}

/** Same rule as the server: all areas, or the chosen city and suburb (case-insensitive), or our own city when none is given. */
function inPlace(org, query) {
  if (query.get('all') === 'true') return true;
  const city = (query.get('city') || '').toLowerCase();
  const suburb = (query.get('suburb') || '').toLowerCase();
  if (!city && !suburb) return (org.city || '').toLowerCase() === 'cape town';
  return (!city || (org.city || '').toLowerCase() === city) && (!suburb || (org.suburb || '').toLowerCase() === suburb);
}

/** City and suburb search over the demo organisations' addresses, like GET /api/area/places. */
function demoPlaces(state, term) {
  const searching = term.length >= 2;
  const orgs = [...state.areaOrgs, { organizationId: 'demo-own', city: 'Cape Town', suburb: 'Woodstock' }];
  const cities = new Map();
  const suburbs = new Map();
  for (const o of orgs) {
    if (!searching || o.city.toLowerCase().includes(term)) cities.set(o.city, (cities.get(o.city) || 0) + 1);
    if (searching && o.suburb && o.suburb.toLowerCase().includes(term)) {
      const key = `${o.suburb}|${o.city}`;
      suburbs.set(key, (suburbs.get(key) || 0) + 1);
    }
  }
  const byName = (a, b) => (a.suburb || a.city).localeCompare(b.suburb || b.city);
  return [
    ...[...cities].map(([city, organizationCount]) => ({ city, suburb: null, organizationCount })).sort(byName),
    ...[...suburbs].map(([key, organizationCount]) => { const [suburb, city] = key.split('|'); return { city, suburb, organizationCount }; }).sort(byName)
  ];
}

function organizationName(state, id) {
  return state.organizations[id]?.name || state.areaOrgs.find(o => o.organizationId === id)?.name || 'Organisation';
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
  state.services = state.services || { [DEMO_ORG_ID]: ['FOOD'], [PARTNER_ORG_ID]: ['COUNSELLING', 'COURSE'] };
  state.partnerships = state.partnerships || [{
    partnershipId: 'demo-pt-1', requesterOrganizationId: DEMO_ORG_ID, requesterOrganizationName: 'Sunrise Community Trust',
    partnerOrganizationId: PARTNER_ORG_ID, partnerOrganizationName: 'Hope Kitchen Collective', status: 'ACTIVE',
    requestedByName: 'Demo Admin', createdDate: ago(30)
  }];
  state.carePlan = state.carePlan || [];
  state.careEvents = state.careEvents || [];
  state.profileRequests = state.profileRequests || [];
  state.areaOrgs = state.areaOrgs || [
    { organizationId: PARTNER_ORG_ID, name: 'Hope Kitchen Collective', orgType: 'NPO', suburb: 'Woodstock', city: 'Cape Town' },
    { organizationId: 'demo-org-3', name: 'Harbour Food Bank', orgType: 'NPO', suburb: 'Salt River', city: 'Cape Town' },
    { organizationId: 'demo-org-4', name: 'Ubuntu Learning Project', orgType: 'NPO', suburb: 'Khayelitsha', city: 'Cape Town' },
    { organizationId: 'demo-org-6', name: 'Table Bay Soup Kitchen', orgType: 'NPO', suburb: 'Bo-Kaap', city: 'Cape Town' },
    { organizationId: 'demo-org-7', name: 'Randburg Relief Centre', orgType: 'NPO', suburb: 'Randburg', city: 'Johannesburg' },
    { organizationId: 'demo-org-8', name: 'Sandton Community Pantry', orgType: 'NPO', suburb: 'Sandton', city: 'Johannesburg' },
    { organizationId: 'demo-org-9', name: 'Umhlanga Helping Hands', orgType: 'NPO', suburb: 'Umhlanga', city: 'Durban' }
  ];
  state.areaProjects = state.areaProjects || [
    { projectId: 'demo-ap-1', organizationId: 'demo-org-3', name: 'Monthly food parcels', projectType: 'FEEDING_SCHEME', description: 'Parcels for 120 households.', mode: 'DISTRIBUTE', openHandout: false },
    { projectId: 'demo-ap-2', organizationId: 'demo-org-3', name: 'Winter blanket drive', projectType: 'OTHER', typeLabel: 'Blanket drive', description: 'Collecting new and second-hand blankets.', mode: 'BOTH', openHandout: false, startsOn: inDays(3), endsOn: inDays(30) },
    { projectId: 'demo-ap-3', organizationId: 'demo-org-4', name: 'Homework club', projectType: 'OTHER', typeLabel: 'After-school club', description: 'Free homework help three afternoons a week.', mode: 'DISTRIBUTE', openHandout: false },
    { projectId: 'demo-ap-4', organizationId: 'demo-org-6', name: 'Saturday soup run', projectType: 'FEEDING_SCHEME', description: 'Hot soup for anyone who needs it.', mode: 'DISTRIBUTE', openHandout: true },
    { projectId: 'demo-ap-5', organizationId: 'demo-org-7', name: 'School shoe drive', projectType: 'OTHER', typeLabel: 'Shoe drive', description: 'Collecting school shoes for the new term.', mode: 'BOTH', openHandout: false, startsOn: inDays(6), endsOn: inDays(20) },
    { projectId: 'demo-ap-6', organizationId: 'demo-org-8', name: 'Weekly pantry', projectType: 'FEEDING_SCHEME', description: 'Groceries for families in need.', mode: 'DISTRIBUTE', openHandout: false },
    { projectId: 'demo-ap-7', organizationId: 'demo-org-9', name: 'Beach clean-up and braai', projectType: 'OTHER', typeLabel: 'Fundraiser', description: 'Community day raising money for the pantry.', mode: 'DISTRIBUTE', openHandout: true }
  ];
  state.areaRequested = state.areaRequested || [];
  state.areaEvents = state.areaEvents || [
    { eventId: 'demo-ev-a1', organizationId: PARTNER_ORG_ID, title: 'Bake sale at the market', eventType: 'FUNDRAISER', startsOn: inDays(5), endsOn: inDays(5), timeNote: '09:00 to 13:00', location: 'Biscuit Mill market', description: 'Funds for the soup kitchen.' },
    { eventId: 'demo-ev-a2', organizationId: 'demo-org-3', title: 'Blanket collection day', eventType: 'DRIVE', startsOn: inDays(8), endsOn: inDays(9), timeNote: null, location: 'Salt River hall', description: null },
    { eventId: 'demo-ev-a3', organizationId: 'demo-org-4', title: 'Volunteer meet-up', eventType: 'MEETING', startsOn: inDays(12), endsOn: inDays(12), timeNote: '18:00', location: null, description: null },
    { eventId: 'demo-ev-a4', organizationId: 'demo-org-9', title: 'Umhlanga fundraising braai', eventType: 'FUNDRAISER', startsOn: inDays(7), endsOn: inDays(7), timeNote: '12:00 to 16:00', location: 'Umhlanga promenade', description: null }
  ];
  state.stockItems = state.stockItems || [{ stockItemId: 'demo-si-1', projectId: 'demo-proj-2', name: 'Reading glasses', targetQuantity: 100 }];
  state.receipts = state.receipts || [{ receiptId: 'demo-rc-1', projectId: 'demo-proj-2', organizationId: DEMO_ORG_ID, stockItemId: 'demo-si-1', quantity: 24, description: null, donor: 'Local optometrist', receivedOn: new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10), recordedByName: 'Demo Admin' }];
  state.handouts = state.handouts || [];
  const path = endpoint.split('?')[0];
  const query = new URLSearchParams(endpoint.split('?')[1] || '');
  let m;
  let result;

  const nextId = (prefix) => `${prefix}-${++state.seq}`;
  const people = () => state.people;

  // Projects
  if ((m = path.match(/^\/api\/organizations\/([^/]+)\/projects$/))) {
    if (method === 'GET') {
      result = state.projects.filter(p => p.organizationId === m[1] || (m[1] === DEMO_ORG_ID && p.projectId === 'demo-proj-4'))
        .map(p => projectView(state, p));
    } else {
      const project = { projectId: nextId('demo-proj'), organizationId: m[1], name: body.name, projectType: body.projectType,
        typeLabel: body.typeLabel || null, description: body.description, status: 'ACTIVE',
        mode: body.mode || 'DISTRIBUTE', openHandout: !!body.openHandout,
        startsOn: body.startsOn || null, endsOn: body.endsOn || null };
      state.projects.push(project);
      result = projectView(state, project);
    }
  } else if ((m = path.match(/^\/api\/projects\/([^/]+)$/))) {
    const project = state.projects.find(p => p.projectId === m[1]);
    if (!project) throw new Error('Project not found');
    if (method === 'PATCH') {
      const { clearRequiredService, clearStartsOn, clearEndsOn, ...changes } = body;
      Object.assign(project, changes);
      if (clearRequiredService) project.requiredServiceType = null;
      if (clearStartsOn) project.startsOn = null;
      if (clearEndsOn) project.endsOn = null;
    }
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

  // What a project collects and gives out
  } else if ((m = path.match(/^\/api\/projects\/([^/]+)\/stock-items$/))) {
    if (method === 'POST') {
      const item = { stockItemId: nextId('demo-si'), projectId: m[1], name: body.name, targetQuantity: body.targetQuantity || null };
      state.stockItems.push(item);
    }
    result = method === 'POST' ? demoStock(state, state.stockItems[state.stockItems.length - 1]) : state.stockItems.filter(i => i.projectId === m[1]).map(i => demoStock(state, i));
  } else if ((m = path.match(/^\/api\/stock-items\/([^/]+)$/))) {
    const item = state.stockItems.find(i => i.stockItemId === m[1]);
    if (body.name) item.name = body.name;
    if (body.clearTarget) item.targetQuantity = null; else if (body.targetQuantity) item.targetQuantity = body.targetQuantity;
    result = demoStock(state, item);
  } else if ((m = path.match(/^\/api\/projects\/([^/]+)\/receipts$/))) {
    if (method === 'POST') {
      const item = state.stockItems.find(i => i.stockItemId === body.stockItemId);
      state.receipts.push({ receiptId: nextId('demo-rc'), projectId: m[1], organizationId: body.organizationId, stockItemId: body.stockItemId || null,
        quantity: body.quantity || null, description: body.description || item?.name || null, donor: body.donor || null,
        receivedOn: body.receivedOn, recordedByName: 'Demo Admin' });
      result = {};
    } else {
      result = state.receipts.filter(r => r.projectId === m[1]).map(r => ({ ...r, organizationName: state.organizations[r.organizationId].name,
        stockItemName: state.stockItems.find(i => i.stockItemId === r.stockItemId)?.name || null, canDelete: true }));
    }
  } else if ((m = path.match(/^\/api\/receipts\/([^/]+)$/))) {
    state.receipts = state.receipts.filter(r => r.receiptId !== m[1]);
    result = null;
  } else if ((m = path.match(/^\/api\/projects\/([^/]+)\/handouts$/))) {
    if (method === 'POST') {
      state.handouts.push({ handoutId: nextId('demo-ho'), projectId: m[1], organizationId: body.organizationId, stockItemId: body.stockItemId || null,
        quantity: body.quantity || 1, description: body.description || null, personId: body.personId || null, peopleCount: body.peopleCount || null,
        handedOn: body.handedOn, givenByName: 'Demo Admin' });
      result = {};
    } else {
      result = { entries: state.handouts.filter(h => h.projectId === m[1]).map(h => demoHandout(state, h)), hiddenCount: 0 };
    }
  } else if ((m = path.match(/^\/api\/handouts\/([^/]+)$/))) {
    state.handouts = state.handouts.filter(h => h.handoutId !== m[1]);
    result = null;
  } else if ((m = path.match(/^\/api\/people\/([^/]+)\/received$/))) {
    result = state.handouts.filter(h => h.personId === m[1]).map(h => demoHandout(state, h));

  // Asking a partner to complete a profile (nobody else uses the demo, so nothing is ever asked of the demo organisation)
  } else if ((m = path.match(/^\/api\/people\/([^/]+)\/profile-requests$/))) {
    if (method === 'POST') {
      const person = state.people.find(x => x.personId === m[1]);
      const partner = state.organizations[body.assigneeOrganizationId] || { name: 'Partner organisation' };
      const request = { requestId: nextId('demo-pr'), personId: m[1], personName: `${person.name} ${person.surname}`,
        requestingOrganizationId: DEMO_ORG_ID, requestingOrganizationName: state.organizations[DEMO_ORG_ID].name,
        assigneeOrganizationId: body.assigneeOrganizationId, assigneeOrganizationName: partner.name, status: 'OPEN',
        note: body.note || null, missingFields: person.missingFields || [], requestedByName: 'Demo Admin', createdDate: new Date().toISOString(),
        canComplete: false, canCancel: true };
      state.profileRequests.push(request);
      result = request;
    } else {
      result = state.profileRequests.filter(r => r.personId === m[1]);
    }
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/profile-requests$/))) {
    result = query.get('direction') === 'outgoing' ? state.profileRequests : [];
  } else if ((m = path.match(/^\/api\/profile-requests\/([^/]+)\/cancel$/))) {
    const request = state.profileRequests.find(r => r.requestId === m[1]);
    request.status = 'CANCELLED';
    request.canCancel = false;
    result = request;
  } else if (path.match(/^\/api\/profile-requests\/([^/]+)\/complete$/)) {
    throw new Error('Only a partner organisation can complete a profile, which the demo cannot show');

  // The area view: other organisations in the same city, their projects and a shared calendar
  } else if (path === '/api/area/cities') {
    result = { cities: ['Cape Town', 'Durban'], defaultCity: 'Cape Town' };
  } else if (path === '/api/area/places') {
    result = demoPlaces(state, (query.get('q') || '').trim().toLowerCase());
  } else if (path === '/api/area/organizations') {
    const partnerIds = state.partnerships.filter(x => x.status === 'ACTIVE').flatMap(x => [x.requesterOrganizationId, x.partnerOrganizationId]);
    result = state.areaOrgs.filter(o => inPlace(o, query)).map(o => ({
      ...o, projectCount: state.areaProjects.filter(ap => ap.organizationId === o.organizationId).length,
      partner: partnerIds.includes(o.organizationId)
    }));
  } else if ((m = path.match(/^\/api\/area\/organizations\/([^/]+)\/projects$/))) {
    result = state.areaProjects.filter(ap => ap.organizationId === m[1])
      .map(ap => ({ ...ap, relationship: state.areaRequested.includes(ap.projectId) ? 'REQUESTED' : 'NONE' }));
  } else if (path === '/api/area/events') {
    const from = query.get('from');
    const to = query.get('to');
    const events = state.areaEvents.filter(e => e.startsOn <= to && e.endsOn >= from && inPlace(orgPlace(state, e.organizationId), query));
    const runs = [...state.projects, ...state.areaProjects]
      .filter(pr => pr.startsOn && pr.status !== 'ARCHIVED' && pr.startsOn <= to && (pr.endsOn || pr.startsOn) >= from
        && inPlace(orgPlace(state, pr.organizationId), query))
      .map(pr => ({ eventId: pr.projectId, organizationId: pr.organizationId, organizationName: organizationName(state, pr.organizationId),
        projectId: pr.projectId, projectName: pr.name, title: pr.name, startsOn: pr.startsOn, endsOn: pr.endsOn || pr.startsOn,
        description: pr.description, hiddenFromArea: false, projectRun: true, clash: false, canEdit: false }));
    result = events.map(e => ({
      ...e, organizationName: organizationName(state, e.organizationId), hiddenFromArea: !!e.hiddenFromArea,
      projectName: state.projects.find(pr => pr.projectId === e.projectId)?.name || null,
      clash: e.eventType === 'FUNDRAISER' && events.some(o => o !== e && o.eventType === 'FUNDRAISER' && o.organizationId !== e.organizationId
        && o.startsOn <= e.endsOn && o.endsOn >= e.startsOn),
      canEdit: e.organizationId === DEMO_ORG_ID
    })).concat(runs).sort((a, b) => (a.startsOn < b.startsOn ? -1 : 1));
  } else if (path === '/api/area/events/clashes') {
    const start = query.get('startsOn');
    const end = query.get('endsOn') || start;
    result = query.get('type') !== 'FUNDRAISER' ? [] : state.areaEvents
      .filter(e => e.eventType === 'FUNDRAISER' && e.organizationId !== DEMO_ORG_ID && !e.hiddenFromArea && e.startsOn <= end && e.endsOn >= start)
      .map(e => ({ ...e, organizationName: organizationName(state, e.organizationId), clash: true, canEdit: false }));
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/events$/))) {
    const event = { eventId: nextId('demo-ev'), organizationId: m[1], ...body, endsOn: body.endsOn || body.startsOn };
    state.areaEvents.push(event);
    result = event;
  } else if ((m = path.match(/^\/api\/events\/([^/]+)$/))) {
    if (method === 'DELETE') {
      state.areaEvents = state.areaEvents.filter(e => e.eventId !== m[1]);
      result = null;
    } else {
      const event = state.areaEvents.find(e => e.eventId === m[1]);
      Object.assign(event, body, { endsOn: body.endsOn || body.startsOn });
      result = event;
    }
  } else if ((m = path.match(/^\/api\/projects\/([^/]+)\/events$/))) {
    result = state.areaEvents.filter(e => e.projectId === m[1]).map(e => ({
      ...e, organizationName: organizationName(state, e.organizationId), hiddenFromArea: !!e.hiddenFromArea, clash: false,
      canEdit: e.organizationId === DEMO_ORG_ID
    })).sort((a, b) => (a.startsOn < b.startsOn ? -1 : 1));
  } else if ((m = path.match(/^\/api\/projects\/([^/]+)\/join-requests$/))) {
    state.areaRequested.push(m[1]);
    result = { participantId: nextId('demo-pp'), projectId: m[1], status: 'REQUESTED' };
  } else if (path.match(/^\/api\/organizations\/([^/]+)\/project-join-requests$/)) {
    result = [];

  // Finding organisations, and projects other organisations invited us to (none in the demo)
  } else if (path === '/api/organizations/search') {
    const q = (query.get('q') || '').toLowerCase();
    result = state.searchableOrgs.filter(o => o.name.toLowerCase().includes(q));
  } else if (path.match(/^\/api\/organizations\/([^/]+)\/project-invitations$/)) {
    result = [];
  } else if (path.match(/^\/api\/projects\/([^/]+)\/participants$/)) {
    result = [];

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

  // Partnerships and care plans
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/services$/))) {
    if (method === 'PUT') state.services[m[1]] = body.services;
    result = state.services[m[1]] || [];
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/partnerships$/))) {
    if (method === 'POST') {
      const target = state.searchableOrgs.find(o => o.organizationId === body.partnerOrganizationId);
      const partnership = { partnershipId: nextId('demo-pt'), requesterOrganizationId: m[1],
        requesterOrganizationName: state.organizations[m[1]].name, partnerOrganizationId: body.partnerOrganizationId,
        partnerOrganizationName: target ? target.name : 'Partner organisation', status: 'PENDING',
        requestedByName: 'Demo Admin', createdDate: new Date().toISOString() };
      state.partnerships.push(partnership);
      result = partnership;
    } else {
      result = state.partnerships
        .filter(p => p.requesterOrganizationId === m[1] || p.partnerOrganizationId === m[1])
        .map(p => ({ ...p, requesterServices: state.services[p.requesterOrganizationId] || [],
          partnerServices: state.services[p.partnerOrganizationId] || [] }));
    }
  } else if ((m = path.match(/^\/api\/partnerships\/([^/]+)\/(accept|decline|end)$/))) {
    const partnership = state.partnerships.find(p => p.partnershipId === m[1]);
    partnership.status = { accept: 'ACTIVE', decline: 'DECLINED', end: 'ENDED' }[m[2]];
    result = partnership;
  } else if ((m = path.match(/^\/api\/families\/([^/]+)\/care-plan$/))) {
    if (method === 'POST') {
      const family = state.families.find(f => f.familyId === m[1]);
      const provider = state.organizations[body.providerOrganizationId] || { name: 'Partner organisation' };
      const item = { itemId: nextId('demo-ci'), familyId: m[1], familyName: family.name, requestingOrganizationId: DEMO_ORG_ID,
        requestingOrganizationName: state.organizations[DEMO_ORG_ID].name, providerOrganizationId: body.providerOrganizationId,
        providerOrganizationName: provider.name, internal: body.providerOrganizationId === DEMO_ORG_ID,
        serviceType: body.serviceType, schedule: body.schedule || null, status: body.providerOrganizationId === DEMO_ORG_ID ? 'ATTENDING' : 'PENDING', canUpdateStatus: body.providerOrganizationId === DEMO_ORG_ID,
        createdDate: new Date().toISOString() };
      state.carePlan.push(item);
      recordCareEvent(state, item, 'CREATED', { toStatus: item.status, nextId });
      result = item;
    } else {
      result = state.carePlan.filter(i => i.familyId === m[1]);
    }
  } else if ((m = path.match(/^\/api\/people\/([^/]+)\/care-plan$/))) {
    if (method === 'POST') {
      const person = state.people.find(p => p.personId === m[1]);
      const provider = state.organizations[body.providerOrganizationId] || { name: 'Partner organisation' };
      const item = { itemId: nextId('demo-ci'), personId: m[1], personName: `${person.name} ${person.surname}`,
        requestingOrganizationId: DEMO_ORG_ID, requestingOrganizationName: state.organizations[DEMO_ORG_ID].name,
        providerOrganizationId: body.providerOrganizationId, providerOrganizationName: provider.name,
        internal: body.providerOrganizationId === DEMO_ORG_ID, serviceType: body.serviceType,
        schedule: body.schedule || null, status: body.providerOrganizationId === DEMO_ORG_ID ? 'ATTENDING' : 'PENDING', canUpdateStatus: body.providerOrganizationId === DEMO_ORG_ID, createdDate: new Date().toISOString() };
      state.carePlan.push(item);
      recordCareEvent(state, item, 'CREATED', { toStatus: item.status, nextId });
      result = item;
    } else {
      result = state.carePlan.filter(i => i.personId === m[1]);
    }
  } else if ((m = path.match(/^\/api\/organizations\/([^/]+)\/care-plan-items$/))) {
    // nobody else uses the demo, so nothing is ever asked of the demo organisation (and incoming is a search anyway)
    result = query.get('direction') === 'outgoing' ? state.carePlan : [];
  } else if ((m = path.match(/^\/api\/care-plan-items\/([^/]+)\/check-in$/))) {
    const item = state.carePlan.find(i => i.itemId === m[1]);
    if (item.status !== 'ATTENDING') throw new Error('Only someone who is attending can be checked in. Mark them as attending first.');
    item.lastCheckedInAt = new Date().toISOString();
    recordCareEvent(state, item, 'CHECKED_IN', { nextId });
    result = item;
  } else if ((m = path.match(/^\/api\/care-plan-items\/([^/]+)\/status$/))) {
    const item = state.carePlan.find(i => i.itemId === m[1]);
    const previous = item.status;
    item.status = body.status;
    recordCareEvent(state, item, 'STATUS_CHANGED', { fromStatus: previous, toStatus: body.status, note: body.note, nextId });
    result = item;
  } else if ((m = path.match(/^\/api\/people\/([^/]+)\/care-history$/))) {
    const person = state.people.find(x => x.personId === m[1]);
    const ids = new Set(state.carePlan.filter(i => i.personId === m[1] || (person?.familyId && i.familyId === person.familyId)).map(i => i.itemId));
    result = state.careEvents.filter(e => ids.has(e.itemId)).sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

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
