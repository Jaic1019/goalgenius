import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Admin.css'

const TABS = ['Matches', 'Results', 'Users']
const FLAGS = {
  'France':'🇫🇷','Germany':'🇩🇪','Brazil':'🇧🇷','Argentina':'🇦🇷',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Spain':'🇪🇸','Portugal':'🇵🇹','Italy':'🇮🇹',
  'Netherlands':'🇳🇱','Belgium':'🇧🇪','Croatia':'🇭🇷','Morocco':'🇲🇦',
  'USA':'🇺🇸','Mexico':'🇲🇽','Canada':'🇨🇦','Japan':'🇯🇵',
  'Senegal':'🇸🇳','Ghana':'🇬🇭','South Korea':'🇰🇷','Australia':'🇦🇺',
  'Switzerland':'🇨🇭','Denmark':'🇩🇰','Uruguay':'🇺🇾','Ecuador':'🇪🇨',
  'Poland':'🇵🇱','Serbia':'🇷🇸','Cameroon':'🇨🇲','Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Qatar':'🇶🇦','Saudi Arabia':'🇸🇦','Iran':'🇮🇷','Tunisia':'🇹🇳',
}

export default function Admin() {
  const [tab, setTab] = useState('Matches')
  const [matches, setMatches] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  // New match form
  const [form, setForm] = useState({
    home_team: '', away_team: '', match_date: '', match_time: '18:00', group_stage: 'Group A'
  })

  // Result inputs: { matchId: { home, away } }
  const [resultInputs, setResultInputs] = useState({})

  // New user form
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '' })
  const [creatingUser, setCreatingUser] = useState(false)

  useEffect(() => { loadMatches(); loadUsers() }, [])

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').order('match_date', { ascending: true })
    setMatches(data || [])
    setLoading(false)
  }

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
  }

  function showAlert(msg, type = 'success') {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 4000)
  }

  // ── Match creation ──
  async function addMatch(e) {
    e.preventDefault()
    const homeFlag = FLAGS[form.home_team] ?? '🏳️'
    const awayFlag = FLAGS[form.away_team] ?? '🏳️'
    const { error } = await supabase.from('matches').insert({
      home_team: form.home_team, away_team: form.away_team,
      home_flag: homeFlag, away_flag: awayFlag,
      match_date: form.match_date, match_time: form.match_time + ':00',
      group_stage: form.group_stage, status: 'upcoming',
    })
    if (!error) {
      showAlert('Match added!')
      setForm({ home_team: '', away_team: '', match_date: '', match_time: '18:00', group_stage: 'Group A' })
      loadMatches()
    } else showAlert('Failed: ' + error.message, 'error')
  }

  async function deleteMatch(id) {
    if (!confirm('Delete this match and all its predictions?')) return
    await supabase.from('predictions').delete().eq('match_id', id)
    await supabase.from('matches').delete().eq('id', id)
    loadMatches()
  }

  // ── Results ──
  function setResult(matchId, side, val) {
    setResultInputs(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: val } }))
  }

  async function saveResult(match) {
    const inp = resultInputs[match.id] || {}
    const h = parseInt(inp.home)
    const a = parseInt(inp.away)
    if (isNaN(h) || isNaN(a)) return showAlert('Enter both scores', 'error')
    const { error } = await supabase.from('matches').update({
      home_score: h, away_score: a, status: 'finished'
    }).eq('id', match.id)
    if (!error) { showAlert('Result saved!'); loadMatches() }
    else showAlert('Failed: ' + error.message, 'error')
  }

  async function setMatchStatus(id, status) {
    await supabase.from('matches').update({ status }).eq('id', id)
    loadMatches()
  }

  // ── User creation ──
  async function createUser(e) {
    e.preventDefault()
    setCreatingUser(true)
    // Create auth user via Supabase admin-ish approach: use signUp then update profile
    // Note: this uses the anon key. For true admin user creation, use a Supabase Edge Function.
    // For a small company app, we'll use the signup flow and set profile manually.
    const { data, error } = await supabase.auth.admin?.createUser
      ? await supabase.auth.admin.createUser({ email: userForm.email, password: userForm.password, email_confirm: true })
      : await supabase.functions.invoke('create-user', { body: userForm })

    if (error) {
      // Fallback: direct signup (works if email confirmation disabled)
      const { data: sd, error: se } = await supabase.auth.signUp({
        email: userForm.email, password: userForm.password,
        options: { data: { full_name: userForm.full_name } }
      })
      if (se) { showAlert('Error: ' + se.message, 'error'); setCreatingUser(false); return }
      if (sd.user) {
        await supabase.from('profiles').upsert({ id: sd.user.id, full_name: userForm.full_name, role: 'employee' })
        showAlert(`Account created for ${userForm.full_name}! Share: ${userForm.email} / ${userForm.password}`)
        setUserForm({ full_name: '', email: '', password: '' })
        loadUsers()
      }
    } else {
      showAlert(`Account created! Share: ${userForm.email} / ${userForm.password}`)
      setUserForm({ full_name: '', email: '', password: '' })
      loadUsers()
    }
    setCreatingUser(false)
  }

  async function deleteUser(id, name) {
    if (!confirm(`Delete ${name}? This will remove all their predictions.`)) return
    await supabase.from('predictions').delete().eq('user_id', id)
    await supabase.from('profiles').delete().eq('id', id)
    loadUsers()
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="admin-page fade-up">
      <div className="page-header">
        <h1 className="display page-title" style={{ color: 'var(--gold)' }}>Admin Panel</h1>
        <p className="page-sub">Manage matches, results and employee accounts.</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── MATCHES TAB ── */}
      {tab === 'Matches' && (
        <div className="admin-section">
          <div className="card">
            <div className="admin-card-title">Add New Match</div>
            <form onSubmit={addMatch} className="match-form">
              <div className="form-row">
                <div className="field">
                  <label>Home Team</label>
                  <input list="team-list" placeholder="France" value={form.home_team}
                    onChange={e => setForm(p => ({ ...p, home_team: e.target.value }))} required />
                </div>
                <div className="field">
                  <label>Away Team</label>
                  <input list="team-list" placeholder="Germany" value={form.away_team}
                    onChange={e => setForm(p => ({ ...p, away_team: e.target.value }))} required />
                </div>
              </div>
              <div className="form-row">
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={form.match_date}
                    onChange={e => setForm(p => ({ ...p, match_date: e.target.value }))} required />
                </div>
                <div className="field">
                  <label>Kick-off Time</label>
                  <input type="time" value={form.match_time}
                    onChange={e => setForm(p => ({ ...p, match_time: e.target.value }))} required />
                </div>
                <div className="field">
                  <label>Stage</label>
                  <select value={form.group_stage}
                    onChange={e => setForm(p => ({ ...p, group_stage: e.target.value }))}>
                    {['Group A','Group B','Group C','Group D','Group E','Group F',
                      'Group G','Group H','Round of 16','Quarter-final','Semi-final','Final'].map(s =>
                      <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" type="submit">+ Add Match</button>
            </form>
            <datalist id="team-list">
              {Object.keys(FLAGS).map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div className="match-list">
            {matches.map(m => (
              <div key={m.id} className="admin-match-row">
                <div className="admin-match-info">
                  <span className="admin-match-teams">{m.home_flag} {m.home_team} vs {m.away_team} {m.away_flag}</span>
                  <span className="admin-match-meta">{m.match_date} · {m.match_time?.slice(0,5)} · {m.group_stage}</span>
                </div>
                <div className="admin-match-actions">
                  <select value={m.status} onChange={e => setMatchStatus(m.id, e.target.value)}
                    className="status-select">
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="finished">Finished</option>
                  </select>
                  <button className="btn btn-danger btn-xs" onClick={() => deleteMatch(m.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RESULTS TAB ── */}
      {tab === 'Results' && (
        <div className="admin-section">
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1rem' }}>
            Enter the final score for each match. Points are calculated automatically.
          </p>
          {matches.filter(m => m.status !== 'upcoming').length === 0 && (
            <div className="empty-state"><p>No live or finished matches yet.</p></div>
          )}
          {matches.filter(m => m.status !== 'upcoming').map(m => (
            <div key={m.id} className="card result-card">
              <div className="result-match-name">
                {m.home_flag} {m.home_team} vs {m.away_team} {m.away_flag}
                <span className="result-meta">{m.group_stage} · {m.match_date}</span>
              </div>
              {m.home_score !== null && (
                <div className="current-score">Current: {m.home_score} – {m.away_score}</div>
              )}
              <div className="result-inputs">
                <input type="number" min="0" max="20" placeholder="Home" className="score-result-in"
                  value={resultInputs[m.id]?.home ?? (m.home_score ?? '')}
                  onChange={e => setResult(m.id, 'home', e.target.value)} />
                <span style={{ color: 'var(--text2)', fontSize: 20 }}>–</span>
                <input type="number" min="0" max="20" placeholder="Away" className="score-result-in"
                  value={resultInputs[m.id]?.away ?? (m.away_score ?? '')}
                  onChange={e => setResult(m.id, 'away', e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={() => saveResult(m)}>Save Result</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'Users' && (
        <div className="admin-section">
          <div className="card">
            <div className="admin-card-title">Create Employee Account</div>
            <form onSubmit={createUser} className="user-form">
              <div className="form-row">
                <div className="field">
                  <label>Full Name</label>
                  <input placeholder="Alex Martin" value={userForm.full_name}
                    onChange={e => setUserForm(p => ({ ...p, full_name: e.target.value }))} required />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" placeholder="alex@company.com" value={userForm.email}
                    onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input type="text" placeholder="temp-password-123" value={userForm.password}
                    onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
                </div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={creatingUser}>
                {creatingUser ? 'Creating…' : '+ Create Account'}
              </button>
            </form>
          </div>

          <div className="user-list">
            <div className="user-list-header">
              <span>{users.length} employees registered</span>
            </div>
            {users.map(u => (
              <div key={u.id} className="user-row">
                <div className="user-avatar-sm">{u.full_name?.[0] ?? '?'}</div>
                <div className="user-info">
                  <span className="user-full-name">{u.full_name}</span>
                  <span className={`badge ${u.role === 'admin' ? 'badge-gold' : 'badge-gray'}`}>
                    {u.role ?? 'employee'}
                  </span>
                </div>
                {u.role !== 'admin' && (
                  <button className="btn btn-danger btn-xs" onClick={() => deleteUser(u.id, u.full_name)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
