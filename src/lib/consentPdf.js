import { fetchConsentPdf } from './api.js'

/** Opens the signed copy of a consent in a new tab. Returns an error message, or '' when it opened. */
export async function openConsentPdf(consentId) {
  const tab = window.open('', '_blank') // opened first, inside the click, so the browser does not block it
  try {
    const blob = await fetchConsentPdf(consentId)
    const url = URL.createObjectURL(blob)
    if (tab) tab.location.href = url
    else window.location.href = url
    return ''
  } catch (err) {
    if (tab) tab.close()
    return err.message || 'Could not open the signed copy'
  }
}
