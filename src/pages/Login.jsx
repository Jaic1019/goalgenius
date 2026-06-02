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
    if (error) setError('Invalid email or password. Please try again.')
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
        <p className="login-sub">World Cup 2026 · Company Prediction Game</p>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Email address</label>
            <input type="email" placeholder="your@mca-technology.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '4px' }}>
            {loading ? 'Signing in…' : 'Enter the pitch →'}
          </button>
        </form>
        <p className="login-hint">Contact your admin to receive login credentials</p>
      </div>

      <div className="login-right fade-up-2">
        <div className="tournament-card">
          <div className="tc-trophy">🏆</div>
          <div className="tc-title display">FIFA World Cup <span>2026</span></div>
          <div className="tc-dates">June 11 – July 19 · USA · Mexico · Canada</div>
          <div className="tc-stats">
            {[['48','Teams'],['104','Matches'],['12','Groups'],['16','Stadiums']].map(([n,l]) => (
              <div key={l} className="tc-stat">
                <span className="tc-n display">{n}</span>
                <span className="tc-l">{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rules-card">
          <div className="rc-head">
            <span>⚡</span>
            <div>
              <div className="rc-title alt">Scoring Rules</div>
              <div className="rc-sub">How points are earned</div>
            </div>
          </div>
          <div className="rc-list">
            {SCORING_RULES.filter(r => r.pts > 0).map(r => (
              <div key={r.pts} className="rc-item">
                <div className="rc-pts display">{r.pts}</div>
                <div>
                  <div className="rc-label">{r.label}</div>
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
