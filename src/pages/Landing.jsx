import { Link } from 'react-router-dom'

const STEPS = [
  ['1', 'Organisations help', 'Charities, churches and schools record the people they help, with their consent, and run projects such as a feeding scheme or a glasses drive.'],
  ['2', 'People keep their dignity', 'Staff add people with whatever details they have and capture a witnessed POPIA consent. Nobody is shared or enrolled without it.'],
  ['3', 'Partners work together', 'Organisations that agree to partner refer families, share services such as counselling, and run projects side by side.'],
]

export default function Landing() {
  return (
    <>
      <div className="landing-hero">
        <header className="site-head">
          <Link to="/" className="site-logo">
            Vouchr
          </Link>
          <nav className="site-nav">
            <Link to="/login">Log in</Link>
            <Link to="/register" className="btn btn-accent btn-sm">
              Get started
            </Link>
          </nav>
        </header>
        <div className="inner">
          <span className="eyebrow-pill">For non-profits &amp; communities</span>
          <h1>Dignity through choice</h1>
          <p className="lead">
            Vouchr helps South African organisations coordinate the help they give: the people they serve, their
            consent, the families they refer and the partners they work with.
          </p>
          <div className="cta">
            <Link to="/register" className="btn btn-accent">
              Get started
            </Link>
            <Link to="/demo" className="btn btn-ghost">
              Try the demo
            </Link>
          </div>
        </div>
      </div>

      <main>
        <section className="landing-section" id="how-it-works">
          <h2>How it works</h2>
          <div className="steps">
            {STEPS.map(([n, title, text]) => (
              <article className="card" key={n}>
                <div className="step-badge">{n}</div>
                <h3>{title}</h3>
                <p className="muted mt">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <h2>Built for trust</h2>
          <p className="muted" style={{ maxWidth: '60ch', fontSize: 17 }}>
            Clean records for organisations. Clear consent for the people they help. Partners only ever see what a
            person agreed to share, and every consent is witnessed and sealed.
          </p>
        </section>

        <section className="landing-section">
          <div className="demo-card">
            <div>
              <h2>See it in action</h2>
              <p>Click through the staff app with sample data. No account needed, and nothing you do is saved.</p>
            </div>
            <Link to="/demo" className="btn btn-accent">
              Try the demo
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-foot">© 2026 Vouchr. Dignity through choice.</footer>
    </>
  )
}
