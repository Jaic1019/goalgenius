import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { SCORING_RULES } from '../lib/scoring'
import './Login.css'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) setError('Email ou mot de passe incorrect.')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-bg-text display">GOAL</div>
      <div className="login-card fade-up">
        <div className="login-icon">⚽</div>
        <h1 className="display login-title">GoalGenius</h1>
        <p className="login-sub">Coupe du Monde 2026 · Pronostics d'entreprise</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="prenom@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '4px' }}>
            {loading ? 'Connexion…' : 'Entrer sur le terrain →'}
          </button>
        </form>
        <p className="login-hint">Contactez votre admin pour obtenir vos identifiants.</p>
      </div>

      <div className="login-rules">
        <div className="rules-title display">🏆 Règles de points</div>
        <div className="rules-list">
          {SCORING_RULES.filter(r => r.pts > 0).map(r => (
            <div className="rule-row" key={r.pts + r.label}>
              <div className="rule-pts-block">
                <span className="rule-pts">{r.pts}</span>
                <span className="rule-pts-label">pts</span>
              </div>
              <div>
                <div className="rule-label">{r.label}</div>
                <div className="rule-desc">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
