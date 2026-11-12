import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

/**
 * The green hero at the top of a page (plain page header on desktop).
 * stats: [{ value, label }]  children: extra controls (e.g. filter chips) shown inside the hero under the stats  action: { label, onClick } shows a yellow add button on phones and a button here on desktop.
 */
export default function PageHero({ eyebrow, title, subtitle, back, stats, action, children }) {
  return (
    <>
      <section className="page-hero">
        {back && (
          <Link to={back.to} className="back-link">
            <Icon name="back" /> {back.label}
          </Link>
        )}
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {subtitle && <p className="hero-sub">{subtitle}</p>}
          </div>
          {action && (
            <button type="button" className="btn btn-accent hero-action" onClick={action.onClick}>
              <Icon name="plus" /> {action.label}
            </button>
          )}
        </div>
        {stats && stats.length > 0 && (
          <div className="stats">
            {stats.map((s) => (
              <div className="stat" key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}
        {children && <div className="hero-extra">{children}</div>}
      </section>
      {action && (
        <button type="button" className="fab" aria-label={action.label} onClick={action.onClick}>
          <Icon name="plus" />
        </button>
      )}
    </>
  )
}
