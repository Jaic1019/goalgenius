import { useState, useMemo } from 'react'
import { useMatches } from '../hooks/useMatches'
import './Teams.css'

// ── Flag resolver — no regex, no external import ──────────────────
const _SF = {'SCO':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','ENG':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','WAL':'🏴󠁧󠁢󠁷󠁬󠁳󠁿','NIR':'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}
function resolveFlag(url) {
  if (!url || url === '🏳️') return null
  if (_SF[url.toUpperCase()]) return _SF[url.toUpperCase()]
  if (url.length > 2 && !url.startsWith('http')) return url
  if (url.length === 2) {
    try { return url.toUpperCase().split('').map(c=>String.fromCodePoint(c.charCodeAt(0)-65+0x1F1E6)).join('') }
    catch { return null }
  }
  if (url.startsWith('http')) return url
  return null
}


// Inline flag resolver
const _SF = {'SCO':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','ENG':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','WAL':'🏴󠁧󠁢󠁷󠁬󠁳󠁿','NIR':'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}
function resolveFlag(url) {
  if (!url||url==='🏳️') return null
  const up=typeof url==='string'?url.toUpperCase():''
  if (_SF[up]) return _SF[up]
  if (!url.startsWith('http')&&!url.includes('.')&&!url.includes('/')&&url.length>2) return url
  if (/^[a-zA-Z]{2}$/.test(url)) { try{return url.toUpperCase().split('').map(c=>String.fromCodePoint(c.charCodeAt(0)-65+0x1F1E6)).join('')}catch{return null} }
  if (url.startsWith('http')) return url
  return null
}

function Flag({ url, name }) {
  const [err, setErr] = useState(false)
  const resolved = resolveFlag(url)
  const fb = <div className="team-fb">{name?.[0]}</div>
  if (!resolved) return fb
  if (!resolved.startsWith('http')) return <div className="team-fb" style={{fontSize:28,background:'transparent',border:'none'}}>{resolved}</div>
  if (err) return fb
  return <img src={resolved} alt={name} className="team-flag" onError={()=>setErr(true)}/>
}
export default function Teams() {
  const { matches, loading } = useMatches()
  const [search, setSearch] = useState('')
  const [groupF, setGroupF] = useState('Tous')
  const { teams, groups } = useMemo(() => {
    const map = {}
    for (const m of matches) {
      if (m.home_team && !map[m.home_team]) map[m.home_team] = { name:m.home_team, flag:m.home_flag, group:m.group_stage }
      if (m.away_team && !map[m.away_team]) map[m.away_team] = { name:m.away_team, flag:m.away_flag, group:m.group_stage }
    }
    const list = Object.values(map).sort((a,b)=>a.group?.localeCompare(b.group)||a.name?.localeCompare(b.name))
    return { teams:list, groups:['Tous',...new Set(list.map(t=>t.group).filter(Boolean).sort())] }
  }, [matches])
  const filtered = teams.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    if (groupF !== 'Tous' && t.group !== groupF) return false
    return true
  })
  if (loading && matches.length===0) return <div className="loading-screen"><div className="spinner"/></div>
  return (
    <div className="teams-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Équipes <span>Participantes</span></h1>
        <p className="page-sub">{teams.length} nations · 3 pays hôtes · Coupe du Monde 2026</p>
      </div>
      <div className="teams-filters">
        <input placeholder="Rechercher une équipe..." value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:240}} />
        <div className="filter-pills">{groups.map(g=><button key={g} className={`fpill ${groupF===g?'active':''}`} onClick={()=>setGroupF(g)}>{g}</button>)}</div>
      </div>
      <div className="teams-grid">
        {filtered.map(t=>(
          <div key={t.name} className="team-card">
            <Flag url={t.flag} name={t.name}/>
            <div className="tc-name">{t.name}</div>
            {t.group && <span className="badge badge-purple" style={{fontSize:10}}>{t.group}</span>}
          </div>
        ))}
      </div>
      {filtered.length===0&&<div className="empty-state"><div className="empty-icon">🌍</div><p>Aucune équipe trouvée.</p></div>}
    </div>
  )
}
