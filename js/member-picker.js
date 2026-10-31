// js/member-picker.js — search-and-pick for people: type to find someone, click Add, remove with the ×.
// Used for family members and for the children covered by a consent.
import { escapeHtml } from './session.js';

const personName = (p) => `${p.name} ${p.surname}`;

/**
 * @param root           element to render into
 * @param getCandidates  returns the people that can be picked (called on every render, so it may change)
 * @param selected       Set of person ids owned by the caller; the picker adds to and removes from it
 * @param emptyText      shown when there is nobody to pick
 * @param placeholder    search box placeholder
 * @returns { refresh(), selectedIds() }
 */
export function memberPicker(root, { getCandidates, selected = new Set(), emptyText = 'Nobody to choose from.',
  placeholder = 'Search by name or school…' } = {}) {
  root.innerHTML = `
    <input type="search" class="mp-input" placeholder="${escapeHtml(placeholder)}" autocomplete="off"
      aria-label="Search people">
    <ul class="search-results mp-results"></ul>
    <p class="muted mp-empty" hidden>${escapeHtml(emptyText)}</p>
    <div class="mp-chosen"></div>`;
  const input = root.querySelector('.mp-input');
  const results = root.querySelector('.mp-results');
  const chips = root.querySelector('.mp-chosen');
  const empty = root.querySelector('.mp-empty');

  const renderChips = (candidates) => {
    chips.innerHTML = candidates.filter(p => selected.has(p.personId)).map(p => `
      <span class="mp-chip">${escapeHtml(personName(p))}
        <button type="button" data-remove="${escapeHtml(p.personId)}" aria-label="Remove ${escapeHtml(personName(p))}">×</button></span>`).join('');
  };

  const renderResults = (candidates) => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; return; }
    const matches = candidates
      .filter(p => !selected.has(p.personId))
      .filter(p => `${p.name} ${p.surname} ${p.school || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
    results.innerHTML = matches.length
      ? matches.map(p => `<li><span>${escapeHtml(personName(p))}
          <span class="mp-meta">${p.ageGroup === 'CHILD' ? 'child' : ''}${p.school ? ` · ${escapeHtml(p.school)}` : ''}</span></span>
          <button type="button" class="btn btn-ghost btn-sm" data-add="${escapeHtml(p.personId)}">Add</button></li>`).join('')
      : '<li class="muted">No one found.</li>';
  };

  const refresh = () => {
    const candidates = getCandidates();
    // anyone who can no longer be picked (e.g. now the signer) drops out of the selection
    [...selected].filter(id => !candidates.some(p => p.personId === id)).forEach(id => selected.delete(id));
    empty.hidden = candidates.length > 0;
    input.disabled = candidates.length === 0;
    renderChips(candidates);
    renderResults(candidates);
  };

  input.addEventListener('input', refresh);
  results.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-add]');
    if (!b) return;
    selected.add(b.dataset.add);
    input.value = '';
    refresh();
    input.focus();
  });
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-remove]');
    if (!b) return;
    selected.delete(b.dataset.remove);
    refresh();
  });

  refresh();
  return { refresh, selectedIds: () => [...selected] };
}
