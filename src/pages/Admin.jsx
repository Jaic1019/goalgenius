import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useMatches } from '../hooks/useMatches'
import './Admin.css'

export default function Admin() {
  const { matches, apiStatus, lastSync, refresh } = useMatches()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert]     = useState(null)
  const [tab, setTab]         = useState('overview')
  const [userForm, setUserForm] = useState({ full_name:'', email:'', password:'' })
  const [creating, setCreating] = useState(false)
  const [overrides, setOverrides] = useState({})

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  function showAlert(msg, type='success') { setAlert({msg,type}); setTimeout(()=>setAlert(null),5000) }

  async function createUser(e) {
    e.preventDefault(); setCreating(true)
    const { data, error } = await supabase.auth.signUp({
      email: userForm.email, password: userForm.password,
      options: { data: { full_name: userForm.full_name } }
    })
    if (error) { showAlert('Erreur : '+error.message,'error'); setCreating(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({ id:data.user.id, full_name:userForm.full_name, role:'employee' })
      showAlert(`✅ Compte créé ! Partagez : ${userForm.email} / ${userForm.password}`)
      setUserForm({ full_name:'', email:'', password:'' }); loadUsers()
    }
    setCreating(false)
  }

  async function deleteUser(id, name) {
    if (!confirm(`Supprimer ${name} et tous ses pronostics ?`)) return
    await supabase.from('predictions').delete().eq('user_id', id)
    await supabase.from('profiles').delete().eq('id', id)
    loadUsers(); showAlert(`${name} supprimé.`)
  }

  function setOv(id, side, val) { setOverrides(p=>({...p,[id]:{...p[id],[side]:val}})) }

  async function saveOverride(match) {
    const o = overrides[match.id] || {}
    const h = o.home !== undefined ? Number(o.home) : match.home_score
    const a = o.away !== undefined ? Number(o.away) : match.away_score
    if (isNaN(h) || isNaN(a)) { showAlert('Entrez les deux scores','error'); return }
    const { error } = await supabase.from('matches')
      .update({ home_score:h, away_score:a, status:'finished', admin_override:true })
      .eq('id', match.id)
    if (!error) { showAlert('Score corrigé ✅'); refresh() }
    else showAlert('Erreur : '+error.message,'error')
  }

  const live = matches.filter(m=>m.status==='live')
  const finished = matches.filter(m=>m.status==='finished')
  const upcoming = matches.filter(m=>m.status==='upcoming')

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="admin-page page fade-up">
      <div className="page-header">
        <h1 className="page-title" style={{color:'var(--mca3)'}}>Panneau <span style={{color:'var(--gold)'}}>Admin</span></h1>
        <p className="page-sub">MCA Technology · Gestion GoalGenius</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      {/* Stats overview */}
      <div className="admin-overview">
        <div className="ov-card"><div className="ov-icon">👥</div><div className="ov-n display">{users.filter(u=>u.role!=='admin').length}</div><div className="ov-l">Collaborateurs</div></div>
        <div className="ov-card"><div className="ov-icon">⚽</div><div className="ov-n display">{matches.length}</div><div className="ov-l">Matchs chargés</div></div>
        <div className="ov-card"><div className="ov-icon">🔴</div><div className="ov-n display">{live.length}</div><div className="ov-l">En direct</div></div>
        <div className="ov-card"><div className="ov-icon">✅</div><div className="ov-n display">{finished.length}</div><div className="ov-l">Terminés</div></div>
        <div className="ov-card api-card">
          <div className={`api-dot ${apiStatus}`} style={{margin:'0 auto 6px'}}/>
          <div className="ov-l">API {apiStatus==='ok'?'Connectée':apiStatus==='warn'?'Dégradée':'Inaccessible'}</div>
          {lastSync&&<div className="ov-sync">Sync {lastSync.toLocaleTimeString('fr-FR')}</div>}
          <button className="btn btn-ghost btn-xs" style={{marginTop:8}} onClick={refresh}>Forcer sync</button>
        </div>
      </div>

      {/* Auto info */}
      <div className="auto-info">
        <span>⚡</span>
        <div><strong>Entièrement automatique :</strong> Les matchs, scores en direct, matchs à élimination directe, classements par groupe et points des collaborateurs sont synchronisés automatiquement depuis l'API toutes les 60 secondes. L'intervention de l'admin n'est nécessaire que pour corriger un score ou gérer les comptes.</div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {[['overview','📊 Vue générale'],['users','👥 Collaborateurs'],['create','➕ Créer un compte'],['overrides','🔧 Correction scores']].map(([v,l])=>(
          <button key={v} className={`atab ${tab===v?'active':''}`} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>

      {tab==='overview' && (
        <div className="card">
          <div className="admin-section-title">Matchs en cours et récents</div>
          {[...live,...finished.slice(-5)].length===0&&<p style={{color:'var(--text2)',fontSize:14}}>Aucun match en cours ou récent.</p>}
          {[...live,...finished.slice(-10)].map(m=>(
            <div key={m.id} className="match-overview-row">
              <span className={`badge ${m.status==='live'?'badge-red':m.status==='finished'?'badge-gray':'badge-purple'}`}>{m.status==='live'?'En direct':m.status==='finished'?'Terminé':'À venir'}</span>
              <span className="mo-name">{m.home_team} vs {m.away_team}</span>
              <span className="mo-score">{m.home_score!=null?`${m.home_score}–${m.away_score}`:'—'}</span>
              <span className="mo-group">{m.group_stage}</span>
              {m.admin_override&&<span className="badge badge-gold" style={{fontSize:9}}>Corrigé manuellement</span>}
            </div>
          ))}
        </div>
      )}

      {tab==='users' && (
        <div className="users-list">
          <div className="ul-header">{users.filter(u=>u.role!=='admin').length} collaborateur(s) inscrit(s)</div>
          {users.map(u=>(
            <div key={u.id} className="user-row">
              <div className="ur-av">{u.full_name?.[0]??'?'}</div>
              <div className="ur-info"><div className="ur-name">{u.full_name}</div><span className={`badge ${u.role==='admin'?'badge-gold':'badge-gray'}`}>{u.role==='admin'?'Admin':'Collaborateur'}</span></div>
              {u.role!=='admin'&&<div className="ur-actions"><button className="btn btn-danger btn-xs" onClick={()=>deleteUser(u.id,u.full_name)}>Supprimer</button></div>}
            </div>
          ))}
        </div>
      )}

      {tab==='create' && (
        <div className="card">
          <div className="admin-section-title">Créer un compte collaborateur</div>
          <form onSubmit={createUser} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div className="form-row">
              <div className="field"><label>Nom complet</label><input placeholder="Alex Martin" value={userForm.full_name} onChange={e=>setUserForm(p=>({...p,full_name:e.target.value}))} required/></div>
              <div className="field"><label>Email</label><input type="email" placeholder="alex@mca-technology.com" value={userForm.email} onChange={e=>setUserForm(p=>({...p,email:e.target.value}))} required/></div>
              <div className="field"><label>Mot de passe temporaire</label><input type="text" placeholder="minimum 6 caractères" value={userForm.password} onChange={e=>setUserForm(p=>({...p,password:e.target.value}))} required minLength={6}/></div>
            </div>
            <div><button className="btn btn-primary" type="submit" disabled={creating}>{creating?'Création...':'+ Créer le compte'}</button></div>
          </form>
        </div>
      )}

      {tab==='overrides' && (
        <div className="card">
          <div className="admin-section-title">Correction manuelle des scores</div>
          <p className="override-note">⚠️ À utiliser uniquement si le score de l'API est incorrect ou manquant. Sera écrasé si l'API fournit un score correct ultérieurement.</p>
          {matches.filter(m=>m.status!=='upcoming').length===0&&<p style={{color:'var(--text2)',fontSize:14,marginTop:'0.5rem'}}>Aucun match en direct ou terminé.</p>}
          {matches.filter(m=>m.status!=='upcoming').map(m=>(
            <div key={m.id} className="override-row">
              <div className="or-match">{m.home_team} vs {m.away_team} <span className="or-group">· {m.group_stage} · {m.match_date}</span></div>
              {m.home_score!=null&&<div className="or-current">Résultat actuel : <strong>{m.home_score}–{m.away_score}</strong>{m.admin_override?' (corrigé manuellement)':''}</div>}
              <div className="or-inputs">
                <input type="number" min="0" max="20" placeholder="Dom." className="or-in" value={overrides[m.id]?.home??m.home_score??''} onChange={e=>setOv(m.id,'home',e.target.value)}/>
                <span style={{color:'var(--text2)'}}>–</span>
                <input type="number" min="0" max="20" placeholder="Ext." className="or-in" value={overrides[m.id]?.away??m.away_score??''} onChange={e=>setOv(m.id,'away',e.target.value)}/>
                <button className="btn btn-green btn-sm" onClick={()=>saveOverride(m)}>Enregistrer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
