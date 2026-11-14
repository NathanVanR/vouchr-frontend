import { useId, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { useToast } from '../toast/useToast.js'
import { initials } from '../lib/format.js'
import RequireAuth from '../auth/RequireAuth.jsx'
import DemoBanner from './DemoBanner.jsx'
import Icon from './Icon.jsx'

const TABS = [
  { to: '/app/projects', label: 'Projects', icon: 'folder' },
  { to: '/app/people', label: 'People', icon: 'people' },
  { to: '/app/families', label: 'Families', icon: 'family' },
  { to: '/app/partners', label: 'Partners', icon: 'partners' },
  { to: '/app/area', label: 'Area', icon: 'calendar' },
]

function OrgSwitch() {
  const { orgs, orgIds, activeOrgId, setActiveOrgId } = useAuth()
  const selectId = useId()
  if (orgIds.length === 0) return <div className="org-switch" />
  if (orgIds.length === 1) {
    return (
      <div className="org-switch">
        <span className="org-name">{orgs[activeOrgId]?.name}</span>
      </div>
    )
  }
  return (
    <div className="org-switch">
      <label className="sr-only" htmlFor={selectId}>
        Active organisation
      </label>
      <select id={selectId} value={activeOrgId} onChange={(e) => setActiveOrgId(e.target.value)}>
        {orgIds.map((id) => (
          <option key={id} value={id}>
            {orgs[id].name}
          </option>
        ))}
      </select>
      <Icon name="chevron" />
    </div>
  )
}

/** The account links, used by the phone menu and by the desktop sidebar. */
function useAccountLinks() {
  const { isAdmin, isPlatformAdmin, demo, logout } = useAuth()
  const toast = useToast()
  const links = [{ to: '/app/account', label: 'Account' }]
  if (isAdmin) links.push({ to: '/app/team', label: 'Manage team' })
  if (isPlatformAdmin) links.push({ to: '/app/platform', label: 'Platform settings' })
  const createOrg = demo
    ? { label: 'Create organisation', onClick: () => toast('Creating an organisation is not available in the demo.') }
    : { to: '/register-org', label: 'Create organisation' }
  return { links, createOrg, logout }
}

function PhoneMenu() {
  const [open, setOpen] = useState(false)
  const { profile, isAdmin, activeOrg } = useAuth()
  const { links, createOrg, logout } = useAccountLinks()
  const close = () => setOpen(false)

  const item = (l) =>
    l.to ? (
      <Link key={l.label} to={l.to} onClick={close}>
        {l.label}
      </Link>
    ) : (
      <button key={l.label} type="button" onClick={() => { close(); l.onClick() }}>
        {l.label}
      </button>
    )

  return (
    <div className="menu-wrap">
      <button type="button" className="avatar-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {initials(activeOrg?.name || profile?.firstName || 'V')}
      </button>
      {open && (
        <>
          <div className="menu-scrim" onClick={close} />
          <div className="menu-pop" role="menu">
            <p className="menu-label">{isAdmin ? 'Organisation admin' : 'Staff'}</p>
            {links.map(item)}
            {item(createOrg)}
            <button type="button" onClick={logout}>
              Log out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Sidebar() {
  const { isAdmin } = useAuth()
  const { links, createOrg, logout } = useAccountLinks()
  return (
    <aside className="sidebar" aria-label="Main">
      <Link to="/app/projects" className="logo">
        Vouchr
      </Link>
      <OrgSwitch />
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
          <Icon name={t.icon} /> {t.label}
        </NavLink>
      ))}
      <div className="side-spacer" />
      <p className="side-label">{isAdmin ? 'Admin' : 'Account'}</p>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
          {l.label}
        </NavLink>
      ))}
      {createOrg.to ? (
        <Link to={createOrg.to} className="side-link">
          {createOrg.label}
        </Link>
      ) : (
        <button type="button" className="side-link" onClick={createOrg.onClick}>
          {createOrg.label}
        </button>
      )}
      <button type="button" className="side-link" onClick={logout}>
        Log out
      </button>
    </aside>
  )
}

function NoOrganisation() {
  const { demo } = useAuth()
  return (
    <div className="page-body" style={{ marginTop: 24 }}>
      <section className="card center">
        <h2>You are not attached to an organisation yet</h2>
        <p className="muted mt">
          Register a new organisation to become its admin, or ask an existing organisation admin to add your email address.
        </p>
        {!demo && (
          <Link to="/register-org" className="btn mt">
            Register a new organisation
          </Link>
        )}
      </section>
    </div>
  )
}

/** The account now signs in with a different email than the staff profile shows: offer to update the profile. */
function EmailBanner() {
  const { emailMismatch, sessionEmail, syncEmail } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (!emailMismatch) return null

  async function update() {
    setBusy(true)
    try {
      await syncEmail()
      toast('Your profile email is updated.')
    } catch (err) {
      toast(err.message || 'Could not update your profile email', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="message" role="status" style={{ margin: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <span>Your sign-in email is now <strong>{sessionEmail}</strong>. Update your profile to match?</span>
      <button type="button" className="btn btn-sm" disabled={busy} onClick={update}>{busy ? 'Updating…' : 'Update'}</button>
    </div>
  )
}

function Shell() {
  const { demo, orgIds } = useAuth()
  return (
    <div>
      {demo && <DemoBanner />}
      <EmailBanner />
      <div className="app">
        <Sidebar />
        <div className="app-main">
          <header className="topbar">
            <OrgSwitch />
            <PhoneMenu />
          </header>
          {orgIds.length === 0 ? <NoOrganisation /> : <Outlet />}
        </div>
        <nav className="bottom-nav" aria-label="Main">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-pill">
                <Icon name={t.icon} />
              </span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default function AppShell() {
  return (
    <RequireAuth>
      <Shell />
    </RequireAuth>
  )
}
