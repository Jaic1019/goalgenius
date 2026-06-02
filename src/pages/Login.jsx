import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { SCORING_RULES } from '../lib/scoring'
import './Login.css'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Veuillez renseigner votre email et mot de passe.'); return }
    setLoading(true); setError('')
    const { error } = await signIn(email.trim(), password)
    if (error) setError('Email ou mot de passe incorrect. Contactez votre administrateur.')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-glow" />

      <div className="login-left fade-up">
        <div className="login-brand">
          <img src="/mca-logo.png" alt="MCA Technology" className="login-logo" />
          <div className="login-tagline">Work With Fun ⚽</div>
        </div>
        <div className="login-sep" />
        <h1 className="login-title display">Goal<span>Genius</span></h1>
        <p className="login-sub">Coupe du Monde 2026 · Jeu de pronostics</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Adresse email</label>
            <input type="email" placeholder="prenom@mca-technology.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', padding: '13px', fontSize: '15px', marginTop: '6px' }}>
            {loading ? 'Connexion en cours...' : 'Entrer sur le terrain →'}
          </button>
        </form>
        <p className="login-hint">Contactez votre administrateur pour obtenir vos identifiants</p>
      </div>

      <div className="login-right fade-up-2">
        <div className="tournament-card">
          <div className="tc-trophy">🏆</div>
          <div className="tc-title display">Coupe du Monde <span>2026</span></div>
          <div className="tc-dates">11 Juin – 19 Juillet · USA · Mexique · Canada</div>
          <div className="tc-stats">
            {[['48','Équipes'],['104','Matchs'],['12','Groupes'],['16','Stades']].map(([n,l]) => (
              <div key={l} className="tc-stat">
                <span className="tc-n display">{n}</span>
                <span className="tc-l">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rules-card">
          <div className="rc-head">
            <span className="rc-icon">⚡</span>
            <div>
              <div className="rc-title alt">Règles de points</div>
              <div className="rc-sub">Comment gagner des points</div>
            </div>
          </div>
          <div className="rc-list">
            {SCORING_RULES.map(r => (
              <div key={r.pts} className="rc-item">
                <div className="rc-pts display">{r.pts}</div>
                <div>
                  <div className="rc-label">{r.emoji} {r.label}</div>
                  <div className="rc-desc">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
