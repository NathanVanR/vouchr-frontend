import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, LEGAL_UPDATED } from '../../lib/legal.js'

/** Plain reading page for the privacy policy and terms: green strip with the logo, one wide white card of text. */
export default function LegalLayout({ title, children }) {
  return (
    <div className="legal-page">
      <header className="legal-head">
        <Link to="/" className="site-logo">Vouchr</Link>
        <nav className="site-nav">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
      </header>
      <main className="legal-card">
        <h1>{title}</h1>
        <p className="muted">Last updated {LEGAL_UPDATED}</p>
        {children}
        <h2>Contact</h2>
        <p>
          {CONTACT_EMAIL
            ? <>Questions about this page, or about your information: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
            : 'Questions about this page, or about your information: speak to the organisation that holds your records, or to the administrator of your Vouchr account.'}
        </p>
      </main>
    </div>
  )
}
