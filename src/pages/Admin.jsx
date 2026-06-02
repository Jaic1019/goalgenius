import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Admin.css'

const TABS = ['Matchs', 'Résultats', 'Utilisateurs']
const FLAGS = {
  'France':'🇫🇷','Germany':'🇩🇪','Allemagne':'🇩🇪','Brazil':'🇧🇷','Brésil':'🇧🇷',
  'Argentina':'🇦🇷','Argentine':'🇦🇷','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Angleterre':'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain':'🇪🇸','Espagne':'🇪🇸','Portugal':'🇵🇹','Italy':'🇮🇹','Italie':'🇮🇹',
  'Netherlands':'🇳🇱','Pays-Bas':'🇳🇱','Belgium':'🇧🇪','Belgique':'🇧🇪',
  'Croatia':'🇭🇷','Croatie':'🇭🇷','Morocco':'🇲🇦','Maroc':'🇲🇦',
  'USA':'🇺🇸','États-Unis':'🇺🇸','Mexico':'🇲🇽','Mexique':'🇲🇽',
  'Canada':'🇨🇦','Japan':'🇯🇵','Japon':'🇯🇵','Senegal':'🇸🇳','Sénégal':'🇸🇳',
  'South Korea':'🇰🇷','Corée du Sud':'🇰🇷','Australia':'🇦🇺','Australie':'🇦🇺',
  'Switzerland':'🇨🇭','Suisse':'🇨🇭','Denmark':'🇩🇰','Danemark':'🇩🇰',
  'Uruguay':'🇺🇾','Ecuador':'🇪🇨','Équateur':'🇪🇨','Poland':'🇵🇱','Pologne':'🇵🇱',
  'Serbia':'🇷🇸','Serbie':'🇷🇸','Cameroon':'🇨🇲','Cameroun':'🇨🇲',
  'Qatar':'🇶🇦','Saudi Arabia':'🇸🇦','Arabie Saoudite':'🇸🇦','Iran':'🇮🇷',
  'Tunisia':'🇹🇳','Tunisie':'🇹🇳','Ghana':'🇬🇭','Panama':'🇵🇦',
  'Colombia':'🇨🇴','Colombie':'🇨🇴','Norway':'🇳🇴','Norvège':'🇳🇴',
  'Czechia':'🇨🇿','Tchéquie':'🇨🇿','South Africa':'🇿🇦','Afrique du Sud':'🇿🇦',
  'Bosnia and Herzegovina':'🇧🇦','Turquie':'🇹🇷','Türkiye':'🇹🇷',
  'Sweden':'🇸🇪','Suède':'🇸🇪','Ivory Coast':'🇨🇮','Côte d\'Ivoire':'🇨🇮',
  'Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Écosse':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Haiti':'🇭🇹','Haïti':'🇭🇹',
  'New Zealand':'🇳🇿','Nouvelle-Zélande':'🇳🇿','Egypt':'🇪🇬','Égypte':'🇪🇬',
  'Algeria':'🇩🇿','Algérie':'🇩🇿','Iraq':'🇮🇶','Irak':'🇮🇶',
  'Jordan':'🇯🇴','Jordanie':'🇯🇴','Austria':'🇦🇹','Autriche':'🇦🇹',
  'Paraguay':'🇵🇾','Cape Verde':'🇨🇻','Cap-Vert':'🇨🇻',
  'Congo DR':'🇨🇩','Uzbekistan':'🇺🇿','Ouzbékistan':'🇺🇿',
  'Curaçao':'🇨🇼','Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿','Pays de Galles':'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
}

export default function Admin() {
  const [tab, setTab] = useState('Matchs')
  const [matches, setMatches] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState({ home_team: '', away_team: '', match_date: '', match_time: '18:00', group_stage: 'Groupe A' })
  const [resultInputs, setResultInputs] = useState({})
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '' })
  const [creatingUser, setCreatingUser] = useState(false)

  useEffect(() => { loadMatches(); loadUsers() }, [])

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').order('match_date').order('match_time')
    setMatches(data || []); setLoading(false)
  }
  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
  }

  function showAlert(msg, type = 'success') { setAlert({ msg, type }); setTimeout(() => setAlert(null), 5000) }

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
    if (!error) { showAlert('Match ajouté !'); setForm({ home_team: '', away_team: '', match_date: '', match_time: '18:00', group_stage: 'Groupe A' }); loadMatches() }
    else showAlert('Erreur : ' + error.message, 'error')
  }

  async function deleteMatch(id) {
    if (!confirm('Supprimer ce match et tous ses pronostics ?')) return
    await supabase.from('predictions').delete().eq('match_id', id)
    await supabase.from('matches').delete().eq('id', id)
    loadMatches()
  }

  function setResult(matchId, side, val) {
    setResultInputs(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: val } }))
  }

  async function saveResult(match) {
    const inp = resultInputs[match.id] || {}
    const h = parseInt(inp.home ?? match.home_score)
    const a = parseInt(inp.away ?? match.away_score)
    if (isNaN(h) || isNaN(a)) return showAlert('Entrez les deux scores', 'error')
    const { error } = await supabase.from('matches').update({ home_score: h, away_score: a, status: 'finished' }).eq('id', match.id)
    if (!error) { showAlert('Résultat enregistré !'); loadMatches() }
    else showAlert('Erreur : ' + error.message, 'error')
  }

  async function setMatchStatus(id, status) {
    await supabase.from('matches').update({ status }).eq('id', id); loadMatches()
  }

  async function createUser(e) {
    e.preventDefault(); setCreatingUser(true)
    const { data: sd, error: se } = await supabase.auth.signUp({
      email: userForm.email, password: userForm.password,
      options: { data: { full_name: userForm.full_name } }
    })
    if (se) { showAlert('Erreur : ' + se.message, 'error'); setCreatingUser(false); return }
    if (sd.user) {
      await supabase.from('profiles').upsert({ id: sd.user.id, full_name: userForm.full_name, role: 'employee' })
      showAlert(`✅ Compte créé ! Partagez : ${userForm.email} / ${userForm.password}`)
      setUserForm({ full_name: '', email: '', password: '' }); loadUsers()
    }
    setCreatingUser(false)
  }

  async function deleteUser(id, name) {
    if (!confirm(`Supprimer ${name} et tous ses pronostics ?`)) return
    await supabase.from('predictions').delete().eq('user_id', id)
    await supabase.from('profiles').delete().eq('id', id)
    loadUsers()
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  const liveAndFinished = matches.filter(m => m.status !== 'upcoming')

  return (
    <div className="admin-page fade-up">
      <div className="page-header">
        <h1 className="display page-title" style={{ color: 'var(--gold)' }}>Admin</h1>
        <p className="page-sub">Gérez les matchs, résultats et comptes employés.</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="admin-tabs">
        {TABS.map(t => <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Matchs' && (
        <div className="admin-section">
          <div className="card">
            <div className="admin-card-title">Ajouter un match</div>
            <form onSubmit={addMatch} className="match-form">
              <div className="form-row">
                <div className="field"><label>Équipe domicile</label><input list="team-list" placeholder="France" value={form.home_team} onChange={e => setForm(p => ({ ...p, home_team: e.target.value }))} required /></div>
                <div className="field"><label>Équipe extérieur</label><input list="team-list" placeholder="Allemagne" value={form.away_team} onChange={e => setForm(p => ({ ...p, away_team: e.target.value }))} required /></div>
              </div>
              <div className="form-row">
                <div className="field"><label>Date</label><input type="date" value={form.match_date} onChange={e => setForm(p => ({ ...p, match_date: e.target.value }))} required /></div>
                <div className="field"><label>Heure</label><input type="time" value={form.match_time} onChange={e => setForm(p => ({ ...p, match_time: e.target.value }))} required /></div>
                <div className="field"><label>Phase</label>
                  <select value={form.group_stage} onChange={e => setForm(p => ({ ...p, group_stage: e.target.value }))}>
                    {['Groupe A','Groupe B','Groupe C','Groupe D','Groupe E','Groupe F','Groupe G','Groupe H','Groupe I','Groupe J','Groupe K','Groupe L','32èmes','Huitièmes','Quarts','Demi-finales','Finale'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" type="submit">+ Ajouter le match</button>
            </form>
            <datalist id="team-list">{Object.keys(FLAGS).map(t => <option key={t} value={t} />)}</datalist>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{matches.length} match(s) enregistré(s)</div>
          <div className="match-list">
            {matches.map(m => (
              <div key={m.id} className="admin-match-row">
                <div className="admin-match-info">
                  <span className="admin-match-teams">{m.home_flag} {m.home_team} vs {m.away_team} {m.away_flag}</span>
                  <span className="admin-match-meta">{m.match_date} · {m.match_time?.slice(0,5)} · {m.group_stage}</span>
                </div>
                <div className="admin-match-actions">
                  <select value={m.status} onChange={e => setMatchStatus(m.id, e.target.value)} className="status-select">
                    <option value="upcoming">À venir</option>
                    <option value="live">En direct</option>
                    <option value="finished">Terminé</option>
                  </select>
                  <button className="btn btn-danger btn-xs" onClick={() => deleteMatch(m.id)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Résultats' && (
        <div className="admin-section">
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: '1rem' }}>
            Entrez le score final. Les points sont recalculés automatiquement.
          </p>
          {liveAndFinished.length === 0 && <div className="empty-state"><p>Aucun match en direct ou terminé.</p></div>}
          {liveAndFinished.map(m => (
            <div key={m.id} className="card result-card">
              <div className="result-match-name">
                {m.home_flag} {m.home_team} vs {m.away_team} {m.away_flag}
                <span className="result-meta">{m.group_stage} · {m.match_date}</span>
              </div>
              {m.home_score !== null && <div className="current-score">Résultat actuel : {m.home_score} – {m.away_score}</div>}
              <div className="result-inputs">
                <input type="number" min="0" max="20" placeholder="Dom." className="score-result-in"
                  value={resultInputs[m.id]?.home ?? (m.home_score ?? '')}
                  onChange={e => setResult(m.id, 'home', e.target.value)} />
                <span style={{ color: 'var(--text2)', fontSize: 20 }}>–</span>
                <input type="number" min="0" max="20" placeholder="Ext." className="score-result-in"
                  value={resultInputs[m.id]?.away ?? (m.away_score ?? '')}
                  onChange={e => setResult(m.id, 'away', e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={() => saveResult(m)}>Enregistrer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Utilisateurs' && (
        <div className="admin-section">
          <div className="card">
            <div className="admin-card-title">Créer un compte employé</div>
            <form onSubmit={createUser} className="user-form">
              <div className="form-row">
                <div className="field"><label>Nom complet</label><input placeholder="Alex Martin" value={userForm.full_name} onChange={e => setUserForm(p => ({ ...p, full_name: e.target.value }))} required /></div>
                <div className="field"><label>Email</label><input type="email" placeholder="alex@entreprise.fr" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} required /></div>
                <div className="field"><label>Mot de passe temporaire</label><input type="text" placeholder="motdepasse123" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} required minLength={6} /></div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={creatingUser}>{creatingUser ? 'Création…' : '+ Créer le compte'}</button>
            </form>
          </div>

          <div className="user-list">
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{users.length} employé(s) inscrit(s)</div>
            {users.map(u => (
              <div key={u.id} className="user-row">
                <div className="user-avatar-sm">{u.full_name?.[0] ?? '?'}</div>
                <div className="user-info">
                  <span className="user-full-name">{u.full_name}</span>
                  <span className={`badge ${u.role === 'admin' ? 'badge-gold' : 'badge-gray'}`}>{u.role === 'admin' ? 'Admin' : 'Employé'}</span>
                </div>
                {u.role !== 'admin' && <button className="btn btn-danger btn-xs" onClick={() => deleteUser(u.id, u.full_name)}>Retirer</button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
