// js/session.js — helpers shared by the staff dashboard and project pages
import { isDemo } from './utils.js';

export function getSupabaseClient() {
  if (window._supabaseClient) return window._supabaseClient;

  const cfg = window.VOUCHR_CONFIG?.supabase;
  if (!cfg?.url || !cfg?.anonKey) {
    console.error('VOUCHR_CONFIG.supabase is missing');
    return null;
  }

  if (typeof supabase === 'undefined') {
    console.error('Supabase JS library not found');
    return null;
  }

  const { createClient } = supabase;
  try {
    window._supabaseClient = createClient(cfg.url, cfg.anonKey);
    return window._supabaseClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

/** Fresh access token from the current Supabase session (the stored one may have expired). */
export async function getAuthToken() {
  if (isDemo()) return 'demo-token';
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session?.access_token || null;
}

export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The shared service catalogue (matches the backend ServiceType enum). Offered by organisations, delivered through
// care plan items and required by projects, so every list and label in the app comes from here.
export const SERVICE_LABELS = {
  FOOD: 'Food',
  CLOTHING: 'Clothing',
  COUNSELLING: 'Counselling',
  COURSE: 'Course / training',
  DOCTOR_VISIT: 'Doctor visit',
  NURSE_VISIT: 'Nurse visit',
  BUDGETING_HELP: 'Help with budgeting',
  OTHER: 'Other'
};

/** The services a project can require someone to be receiving before they get aid. */
export const PREREQUISITE_SERVICES = {
  COUNSELLING: SERVICE_LABELS.COUNSELLING,
  COURSE: SERVICE_LABELS.COURSE,
  BUDGETING_HELP: SERVICE_LABELS.BUDGETING_HELP
};

/** A service's name; "Other" shows the free-text label somebody typed in. */
export function serviceName(type, label) {
  return type === 'OTHER' && label ? label : (SERVICE_LABELS[type] || type);
}

/** A project's kind; "Other" shows the free-text label somebody typed in. */
export function projectTypeName(type, label) {
  return type === 'OTHER' && label ? label : (PROJECT_TYPE_LABELS[type] || type);
}

/** <option> tags for a labels object, e.g. fillSelect(select, SERVICE_LABELS, 'No prerequisite'). */
export function fillSelect(select, labels, emptyLabel = null) {
  select.innerHTML = (emptyLabel === null ? '' : `<option value="">${escapeHtml(emptyLabel)}</option>`)
    + Object.entries(labels).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
}

export const CARE_STATUS_LABELS = {
  PENDING: 'Waiting for a reply',
  ATTENDING: 'Attending',
  COMPLETED: 'Completed',
  LAPSED: 'Lapsed',
  DECLINED: 'Declined',
  CLOSED: 'Closed'
};

export const PROJECT_TYPE_LABELS = {
  FEEDING_SCHEME: 'Feeding scheme',
  GLASSES_DRIVE: 'Reading glasses drive',
  SCHOOL_SUPPLIES_DRIVE: 'School supplies drive',
  CLOTHING_DRIVE: 'Clothing drive',
  OTHER: 'Other'
};

/** Relationship of a dependent to the adult they are registered under (matches the backend Relationship enum). */
export const RELATIONSHIP_OPTIONS = [
  ["CHILD", "Child"],
  ["STEPCHILD", "Stepchild"],
  ["FOSTER_CHILD", "Foster child"],
  ["GRANDCHILD", "Grandchild"],
  ["SIBLING", "Sibling"],
  ["NIECE_NEPHEW", "Niece / nephew"],
  ["SPOUSE_PARTNER", "Spouse / partner"],
  ["PARENT", "Parent"],
  ["OTHER_RELATIVE", "Other relative"],
  ["OTHER", "Other"]
];

export const RELATIONSHIP_LABELS = Object.fromEntries(RELATIONSHIP_OPTIONS);

