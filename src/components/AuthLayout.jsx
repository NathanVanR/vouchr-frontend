import { Link } from 'react-router-dom'

/** Green page with a white card, used by login, registration and creating an organisation. */
export default function AuthLayout({ title, intro, headLink, children, footer }) {
  return (
    <div className="auth-page">
      <header className="auth-head">
        <Link to="/" className="site-logo">
          Vouchr
        </Link>
        {headLink && <Link to={headLink.to}>{headLink.label}</Link>}
      </header>
      <main className="auth-card">
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
        {children}
        {footer}
      </main>
    </div>
  )
}
