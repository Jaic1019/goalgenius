import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import './Login.css'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) setError('Invalid email or password.')
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-bg-text display">GOAL</div>

      <div className="login-card fade-up">
        <div className="login-icon">⚽</div>
        <h1 className="display login-title">GoalGenius</h1>
        <p className="login-sub">World Cup 2026 · Company Predictor</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '4px' }}>
            {loading ? 'Signing in…' : 'Enter the pitch →'}
          </button>
        </form>

        <p className="login-hint">Ask your admin for your login credentials.</p>
      </div>

      <div className="login-rules">
        <div className="rules-title display">Scoring Rules</div>
        <div className="rules-list">
          {[
            ['10 pts', 'Exact score + correct winner'],
            ['7 pts', 'Correct winner + one team score exact'],
            ['6 pts', 'Correct winner + off by 1 each team'],
            ['5 pts', 'Correct winner only'],
            ['5 pts', 'Exact goals, wrong winner'],
            ['3 pts', 'Close total goals, wrong winner'],
          ].map(([pts, desc]) => (
            <div className="rule-row" key={pts + desc}>
              <span className="rule-pts">{pts}</span>
              <span className="rule-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
