import { useState, useMemo } from 'react'
import { useMatches } from '../hooks/useMatches'
import './Teams.css'
function Flag({ url, name }) {
  const [err, setErr] = useState(false)
  if (!url || url === '🏳️') return <div className="team-fb">{name?.[0]}</div>
  const isEmoji = !url.startsWith('http') && !url.includes('.') && !url.includes('/')
  if (isEmoji) return <div className="team-fb" style={{fontSize:28}}>{url}</div>
  if (err) return <div className="team-fb">{name?.[0]}</div>
  return <img src={url} alt={name} className="team-flag" onError={() => setErr(true)} />
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
