import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useMatches } from '../hooks/useMatches'
import './Admin.css'

export default function Admin() {
  const { matches, apiStatus, lastSync, refresh } = useMatches()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [tab, setTab] = useState('overview')
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
    if (error) { showAlert('Error: '+error.message,'error'); setCreating(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({ id:data.user.id, full_name:userForm.full_name, role:'employee' })
      showAlert(`✅ Account created! Share credentials: ${userForm.email} / ${userForm.password}`)
      setUserForm({ full_name:'', email:'', password:'' })
      loadUsers()
    }
    setCreating(false)
  }

  async function deleteUser(id, name) {
    if (!confirm(`Remove ${name} and all their predictions?`)) return
    await supabase.from('predictions').delete().eq('user_id', id)
    await supabase.from('profiles').delete().eq('id', id)
    loadUsers()
    showAlert(`${name} removed.`)
  }

  // Score override — admin can manually correct a match score
  async function saveOverride(matchId) {
    const o = overrides[matchId]
    if (o?.home===undefined||o?.away===undefined) return
    const { error } = await supabase.from('matches')
      .update({ home_score:Number(o.home), away_score:Number(o.away), status:'finished', admin_override:true })
      .eq('id', matchId)
    if (!error) { showAlert('Score overridden ✅'); refresh() }
    else showAlert('Failed: '+error.message,'error')
  }

  function setOv(id, side, val) {
    setOverrides(p => ({ ...p, [id]: { ...p[id], [side]: val } }))
  }

  const liveOrRecent = matches.filter(m => m.status==='live'||(m.status==='finished'&&m.match_date>=new Date(Date.now()-86400000*3).toISOString().slice(0,10)))

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="admin-page page fade-up">
      <div className="page-header">
        <h1 className="page-title" style={{color:'var(--mca3)'}}>Admin <span style={{color:'var(--gold)'}}>Panel</span></h1>
        <p className="page-sub">MCA Technology · GoalGenius management</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      {/* Status overview */}
      <div className="admin-overview">
        <div className="ov-card">
          <div className="ov-icon">👥</div>
          <div className="ov-n display">{users.filter(u=>u.role!=='admin').length}</div>
          <div className="ov-l">Collaborators</div>
        </div>
        <div className="ov-card">
          <div className="ov-icon">⚽</div>
          <div className="ov-n display">{matches.length}</div>
          <div className="ov-l">Matches loaded</div>
        </div>
        <div className="ov-card">
          <div className="ov-icon">🔴</div>
          <div className="ov-n display">{matches.filter(m=>m.status==='live').length}</div>
          <div className="ov-l">Live now</div>
        </div>
        <div className="ov-card">
          <div className="ov-icon">✅</div>
          <div className="ov-n display">{matches.filter(m=>m.status==='finished').length}</div>
          <div className="ov-l">Finished</div>
        </div>
        <div className="ov-card api-card">
          <div className={`api-dot ${apiStatus}`} style={{margin:'0 auto 6px'}}/>
          <div className="ov-l">API {apiStatus==='ok'?'Connected':apiStatus==='warn'?'Degraded':'Unreachable'}</div>
          {lastSync && <div className="ov-sync">Last sync {lastSync.toLocaleTimeString('en-GB')}</div>}
          <button className="btn btn-ghost btn-xs" style={{marginTop:8}} onClick={refresh}>Force sync</button>
        </div>
      </div>

      {/* Auto info */}
      <div className="auto-info">
        <span>⚡</span>
        <div>
          <strong>Fully automatic:</strong> Match schedules, live scores, knockout fixtures, group standings, and player points all sync automatically from the World Cup API every 60 seconds. Admin intervention is only needed for manual score corrections or user management.
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {[['overview','📊 Overview'],['users','👥 Users'],['create','➕ Create Account'],['overrides','🔧 Score Override']].map(([v,l]) => (
          <button key={v} className={`atab ${tab===v?'active':''}`} onClick={()=>setTab(v)}>{l}</button>
        ))}
      </div>

      {/* Overview tab */}
      {tab==='overview' && (
        <div className="card">
          <div className="admin-section-title">Recent & Live Matches</div>
          {liveOrRecent.length===0 && <p style={{color:'var(--text2)',fontSize:14}}>No live or recent matches.</p>}
          {liveOrRecent.map(m => (
            <div key={m.id} className="match-overview-row">
              <span className={`badge ${m.status==='live'?'badge-red':m.status==='finished'?'badge-gray':'badge-purple'}`}>{m.status}</span>
              <span className="mo-name">{m.home_team} vs {m.away_team}</span>
              <span className="mo-score">{m.home_score!=null?`${m.home_score}–${m.away_score}`:'—'}</span>
              <span className="mo-group">{m.group_stage}</span>
              {m.admin_override && <span className="badge badge-gold" style={{fontSize:9}}>Overridden</span>}
            </div>
          ))}
        </div>
      )}

      {/* Users tab */}
      {tab==='users' && (
        <div className="users-list">
          <div className="ul-header">{users.filter(u=>u.role!=='admin').length} collaborators registered</div>
          {users.map(u => (
            <div key={u.id} className="user-row">
              <div className="ur-av">{u.full_name?.[0]??'?'}</div>
              <div className="ur-info">
                <div className="ur-name">{u.full_name}</div>
                <span className={`badge ${u.role==='admin'?'badge-gold':'badge-gray'}`}>{u.role==='admin'?'Admin':'Collaborator'}</span>
              </div>
              {u.role!=='admin' && (
                <div className="ur-actions">
                  <button className="btn btn-danger btn-xs" onClick={()=>deleteUser(u.id,u.full_name)}>Remove</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create account tab */}
      {tab==='create' && (
        <div className="card">
          <div className="admin-section-title">Create collaborator account</div>
          <form onSubmit={createUser} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
            <div className="form-row">
              <div className="field"><label>Full Name</label><input placeholder="Alex Martin" value={userForm.full_name} onChange={e=>setUserForm(p=>({...p,full_name:e.target.value}))} required/></div>
              <div className="field"><label>Email</label><input type="email" placeholder="alex@mca-technology.com" value={userForm.email} onChange={e=>setUserForm(p=>({...p,email:e.target.value}))} required/></div>
              <div className="field"><label>Temporary Password</label><input type="text" placeholder="min 6 characters" value={userForm.password} onChange={e=>setUserForm(p=>({...p,password:e.target.value}))} required minLength={6}/></div>
            </div>
            <div><button className="btn btn-primary" type="submit" disabled={creating}>{creating?'Creating…':'+ Create Account'}</button></div>
          </form>
        </div>
      )}

      {/* Score override tab */}
      {tab==='overrides' && (
        <div className="card">
          <div className="admin-section-title">Manual Score Override</div>
          <p className="override-note">⚠️ Use only if the API score is wrong or missing. This will be overwritten if the API provides a correct score later.</p>
          {matches.filter(m=>m.status!=='upcoming').map(m => (
            <div key={m.id} className="override-row">
              <div className="or-match">{m.home_team} vs {m.away_team} <span className="or-group">· {m.group_stage}</span></div>
              {m.home_score!=null && <div className="or-current">Current: <strong>{m.home_score}–{m.away_score}</strong>{m.admin_override&&' (manually set)'}</div>}
              <div className="or-inputs">
                <input type="number" min="0" max="20" placeholder="Home" className="or-in"
                  value={overrides[m.id]?.home??m.home_score??''} onChange={e=>setOv(m.id,'home',e.target.value)}/>
                <span style={{color:'var(--text2)'}}>–</span>
                <input type="number" min="0" max="20" placeholder="Away" className="or-in"
                  value={overrides[m.id]?.away??m.away_score??''} onChange={e=>setOv(m.id,'away',e.target.value)}/>
                <button className="btn btn-green btn-sm" onClick={()=>saveOverride(m.id)}>Save</button>
              </div>
            </div>
          ))}
          {matches.filter(m=>m.status!=='upcoming').length===0 && <p style={{color:'var(--text2)',fontSize:14,marginTop:'0.5rem'}}>No live or finished matches yet.</p>}
        </div>
      )}
    </div>
  )
}
