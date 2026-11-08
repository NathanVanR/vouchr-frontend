// js/aid.js - giving aid in a project: start a session (e.g. a weekly soup run), then tick off the enrolled people who
// receive aid. The consent and service-prerequisite rules are applied by the server when each person is ticked off.
import { getProjectSessions, openProjectSession, getAidSession, giveAid, undoAid } from './api.js';
import { getAuthToken, escapeHtml } from './session.js';

const byId = (id) => document.getElementById(id);
const fullName = (p) => `${p.name} ${p.surname}`;
const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString();

/**
 * @param projectId   the project
 * @param getEnrolled returns the enrolments the viewer can see (already loaded by project.js)
 * @param getOrgId    the organisation we act for (the one whose people we enrol)
 */
export function initAid({ projectId, getEnrolled, getOrgId }) {
  const list = byId('sessions-list');
  const detail = byId('session-detail');
  const message = byId('session-message');
  let openId = null;
  let session = null;
  let note = '';

  byId('session-date').value = new Date().toISOString().slice(0, 10);

  async function loadSessions() {
    try {
      const sessions = await getProjectSessions(projectId, await getAuthToken());
      list.innerHTML = sessions.map(s => `
        <li class="family-row">
          <span><button type="button" class="text-link" data-open="${escapeHtml(s.sessionId)}">${escapeHtml(s.label || 'Session')} · ${escapeHtml(dateText(s.date))}</button>
            <span class="mp-meta">${escapeHtml(s.organizationName)} · ${s.handoverCount} ${s.handoverCount === 1 ? 'person' : 'people'}</span></span>
        </li>`).join('') || '<li class="muted">No sessions yet.</li>';
    } catch (err) {
      console.error(err);
      message.textContent = err.message || 'Could not load sessions';
    }
  }

  async function openSession(id) {
    openId = id;
    try {
      session = await getAidSession(id, await getAuthToken());
      renderDetail();
    } catch (err) {
      console.error(err);
      message.textContent = err.message || 'Could not open the session';
    }
  }

  function renderDetail() {
    if (!session) { detail.innerHTML = ''; return; }
    const given = new Set((session.handovers || []).map(h => h.personId));
    detail.innerHTML = `
      <h3>${escapeHtml(session.label || 'Session')} · ${escapeHtml(dateText(session.date))}
        <span class="muted">run by ${escapeHtml(session.organizationName)}</span></h3>
      ${session.canGive ? `
        <div class="form-group"><label for="aid-note">What is being handed over (optional)</label>
          <input type="text" id="aid-note" maxlength="255" placeholder="e.g. hot meal" value="${escapeHtml(note)}"></div>
        <div class="form-group"><label for="aid-search">Find an enrolled person</label>
          <input type="search" id="aid-search" class="mp-input" placeholder="Search by name…" autocomplete="off"></div>
        <ul class="search-results" id="aid-results"></ul>` : '<p class="muted">Only staff of the organisation running this session can tick people off.</p>'}
      <h4>${session.handoverCount} ${session.handoverCount === 1 ? 'person has' : 'people have'} received aid</h4>
      <ul class="family-list">${(session.handovers || []).map(h => `
        <li class="family-row">
          <span>${escapeHtml(fullName(h))}
            <span class="mp-meta">${h.note ? escapeHtml(h.note) : ''}${h.overrideReason ? ` · prerequisite not met: ${escapeHtml(h.overrideReason)}` : ''}</span></span>
          ${h.canUndo ? `<button type="button" class="text-link is-danger" data-undo="${escapeHtml(h.handoverId)}">Undo</button>` : ''}
        </li>`).join('') || '<li class="muted">Nobody yet.</li>'}</ul>
      ${session.hiddenHandoverCount ? `<p class="muted">${session.hiddenHandoverCount} more received aid but are not shown: they did not agree to be shared with partner organisations.</p>` : ''}`;

    const search = byId('aid-search');
    if (!search) return;
    byId('aid-note').addEventListener('input', (e) => { note = e.target.value; });
    search.addEventListener('input', () => renderResults(search.value, given));
  }

  function renderResults(query, given) {
    const results = byId('aid-results');
    const q = query.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; return; }
    const matches = getEnrolled()
      .filter(p => p.consentStatus === 'VALID' && !given.has(p.personId) && fullName(p).toLowerCase().includes(q))
      .slice(0, 8);
    results.innerHTML = matches.map(p => `
      <li><span>${escapeHtml(fullName(p))}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-give="${escapeHtml(p.personId)}">Give aid</button></li>`).join('')
      || '<li class="muted">No one found. Only enrolled people can be given aid.</li>';
  }

  async function give(personId) {
    const payload = { personId, note: note.trim() || null };
    try {
      try {
        await giveAid(openId, payload, await getAuthToken());
      } catch (err) {
        // a project that only warns about its prerequisite lets staff continue with a reason
        if (!/Give a reason/.test(err.message || '')) throw err;
        const reason = prompt(`${err.message}\n\nReason:`);
        if (!reason || !reason.trim()) return;
        await giveAid(openId, { ...payload, overrideReason: reason.trim() }, await getAuthToken());
      }
      message.textContent = '';
      await openSession(openId);
      loadSessions();
    } catch (err) {
      console.error(err);
      message.textContent = err.message || 'Could not record that';
    }
  }

  list.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-open]');
    if (b) openSession(b.dataset.open);
  });

  detail.addEventListener('click', async (e) => {
    const giveBtn = e.target.closest('button[data-give]');
    if (giveBtn) return give(giveBtn.dataset.give);
    const undoBtn = e.target.closest('button[data-undo]');
    if (undoBtn) {
      try {
        await undoAid(undoBtn.dataset.undo, await getAuthToken());
        await openSession(openId);
        loadSessions();
      } catch (err) {
        console.error(err);
        message.textContent = err.message || 'Could not undo that';
      }
    }
  });

  byId('session-start-btn').addEventListener('click', async () => {
    message.textContent = 'Starting…';
    try {
      const started = await openProjectSession(projectId, {
        organizationId: getOrgId(),
        date: byId('session-date').value || null,
        label: byId('session-label').value.trim() || null
      }, await getAuthToken());
      byId('session-label').value = '';
      message.textContent = '';
      await loadSessions();
      await openSession(started.sessionId);
    } catch (err) {
      console.error(err);
      message.textContent = err.message || 'Could not start the session';
    }
  });

  return { loadSessions };
}
