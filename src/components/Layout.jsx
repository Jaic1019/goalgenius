import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './Layout.css'

const NAV = [
  { to: '/',            label: 'Accueil',      icon: '⚡', end: true },
  { to: '/matches',     label: 'Matchs',       icon: '⚽' },
  { to: '/leaderboard', label: 'Classement',   icon: '🏆' },
  { to: '/groups',      label: 'Groupes',      icon: '📊' },
  { to: '/teams',       label: 'Équipes',      icon: '🌍' },
  { to: '/stadiums',    label: 'Stades',       icon: '🏟️' },
]

export default function Layout() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  async function handleSignOut() { await signOut(); navigate('/login') }

  return (
    <div className="layout">
      <header className="header">
        <NavLink to="/" className="brand">
          <img src="/mca-logo.png" alt="MCA Technology" className="brand-logo" />
          <div className="brand-sep" />
          <span className="brand-app display">GoalGenius</span>
          <span className="brand-tag">CDM 2026</span>
        </NavLink>

        <nav className="nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-text">{n.label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin"
              className={({ isActive }) => `nav-link nav-admin ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Admin</span>
            </NavLink>
          )}
        </nav>

        <div className="header-end">
          <div className="user-pill">
            <div className="user-av">{profile?.full_name?.[0] ?? '?'}</div>
            <div className="user-meta">
              <span className="user-name">{profile?.full_name?.split(' ')[0]}</span>
              {isAdmin && <span className="admin-tag">Admin</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Déconnexion</button>
        </div>
      </header>

      <main className="main">
        <div className="main-inner"><Outlet /></div>
      </main>

      <footer className="footer">
        <img src="/mca-logo.png" alt="MCA Technology" className="footer-logo" />
        <span className="footer-txt">Work With Fun · Coupe du Monde 2026</span>
      </footer>
    </div>
  )
}
