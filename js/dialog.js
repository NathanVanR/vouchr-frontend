// js/dialog.js — a small modal built the same way as the consent dialogs.
import { escapeHtml } from './session.js';

export function openDialog(titleText, html) {
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
