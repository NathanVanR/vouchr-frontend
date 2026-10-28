import { getPlatformMe, getOperatorHistory, saveOperatorDetails } from './api.js';
import { getAuthToken, escapeHtml } from './session.js';

const FIELDS = {
  legalName: 'legal-name',
  registrationNumber: 'registration-number',
  physicalAddress: 'physical-address',
  contactDetails: 'contact-details',
  informationOfficer: 'information-officer'
};

let hasCurrent = false;

function message(text, type = '') {
  const el = document.getElementById('save-message');
  el.hidden = !text;
  el.textContent = text || '';
  el.className = `message ${type}`.trim();
}

function fillForm(current) {
  for (const [key, id] of Object.entries(FIELDS)) {
    document.getElementById(id).value = current?.[key] || '';
  }
  document.getElementById('change-reason').value = '';
}

function renderHistory(history) {
  const container = document.getElementById('history');
  if (!history.length) {
    container.innerHTML = '<p class="muted">Nothing has been entered yet.</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>When</th><th>Changed by</th><th>What changed</th><th>Reason</th><th>Information Officer</th></tr>
        </thead>
        <tbody>
          ${history.map((h, i) => `
            <tr>
              <td>${escapeHtml(new Date(h.createdDate).toLocaleString())}${i === 0 ? ' <span class="badge badge-active">Current</span>' : ''}</td>
              <td>${escapeHtml(h.changedByName)}</td>
              <td>${h.changedFields.length ? escapeHtml(h.changedFields.join(', ')) : 'First entry'}</td>
              <td>${escapeHtml(h.changeReason || '—')}</td>
              <td>${escapeHtml(h.informationOfficer)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function load() {
  const history = await getOperatorHistory(await getAuthToken());
  hasCurrent = history.length > 0;
  fillForm(history[0]);
  document.getElementById('reason-group').hidden = !hasCurrent;
  document.getElementById('change-reason').required = hasCurrent;
  renderHistory(history);
}

async function init() {
  const error = document.getElementById('platform-error');

  try {
    const me = await getPlatformMe(await getAuthToken());
    if (!me.platformAdmin) {
      error.textContent = 'Only Vouchr platform admins can change these settings.';
      error.hidden = false;
      return;
    }
    await load();
  } catch (err) {
    console.error(err);
    error.textContent = err.message || 'Could not load the platform settings.';
    error.hidden = false;
    return;
  }

  document.getElementById('platform-content').hidden = false;

  const form = document.getElementById('operator-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = { changeReason: document.getElementById('change-reason').value.trim() || null };
    for (const [key, id] of Object.entries(FIELDS)) {
      payload[key] = document.getElementById(id).value.trim() || null;
    }

    const button = document.getElementById('save-btn');
    button.disabled = true;
    message('Saving…');
    try {
      await saveOperatorDetails(payload, await getAuthToken());
      await load();
      message('Saved. A new version was added to the history.', 'success');
    } catch (err) {
      console.error(err);
      message(err.message || 'Failed to save', 'error');
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
