import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './Layout.css'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <span className="header-logo">⚽</span>
          <span className="display header-title">GoalGenius</span>
          <span className="header-season">Coupe du Monde 2026</span>
        </div>

        <nav className="header-nav">
          <NavLink to="/matches" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Matchs
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Classement
          </NavLink>
          <NavLink to="/standings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Groupes
          </NavLink>
          {profile?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link nav-link-admin ${isActive ? 'active' : ''}`}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="header-user">
          <div className="user-avatar">{profile?.full_name?.[0] ?? '?'}</div>
          <span className="user-name">{profile?.full_name}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Déconnexion</button>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
