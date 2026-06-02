import { useState, useMemo } from 'react'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import MatchCard from '../components/MatchCard'
import './Matches.css'

const STAGES = ['Tous','Phase de groupes','Top 32','Top 16','Quarts de finale','Demi-finales','Finale']

function stageBucket(g) {
  if (!g) return 'Phase de groupes'
  const s = g.toLowerCase()
  if (s.includes('r32') || s.includes('32') || s.includes('top 32')) return 'Top 32'
  if (s.includes('r16') || s.includes('16') || s.includes('top 16')) return 'Top 16'
  if (s.includes('qf') || s.includes('quart')) return 'Quarts de finale'
  if (s.includes('sf') || s.includes('semi') || s.includes('demi')) return 'Demi-finales'
  if ((s.includes('final') || s.includes('finale')) && !s.includes('semi') && !s.includes('quart') && !s.includes('demi') && !s.includes('3rd')) return 'Finale'
  return 'Phase de groupes'
}

// Hide TBD matches (knockout matches not yet determined)
function isValidMatch(m) {
  const home = (m.home_team || '').trim().toUpperCase()
  const away = (m.away_team || '').trim().toUpperCase()
  return home !== 'TBD' && away !== 'TBD' && home !== '' && away !== ''
}

export default function Matches() {
  const { matches, loading, apiStatus, lastSync } = useMatches()
  const { predictions, saving, save } = usePredictions()
  const [drafts, setDrafts]   = useState({})
  const [alerts, setAlerts]   = useState({})
  const [statusF, setStatusF] = useState('all')
  const [stageF,  setStageF]  = useState('Tous')
  const [groupF,  setGroupF]  = useState('Tous')
  const [teamQ,   setTeamQ]   = useState('')

  // Only show valid (non-TBD) matches
  const validMatches = useMemo(() => matches.filter(isValidMatch), [matches])

  const groupNames = useMemo(() => ['Tous', ...new Set(
    validMatches.filter(m => stageBucket(m.group_stage) === 'Phase de groupes')
           .map(m => m.group_stage).filter(Boolean).sort()
  )], [validMatches])

  const filtered = useMemo(() => validMatches.filter(m => {
    if (statusF !== 'all' && m.status !== statusF) return false
    if (stageF !== 'Tous' && stageBucket(m.group_stage) !== stageF) return false
    if (groupF !== 'Tous' && m.group_stage !== groupF) return false
    if (teamQ.trim()) {
      const q = teamQ.trim().toLowerCase()
      return m.home_team?.toLowerCase().includes(q) || m.away_team?.toLowerCase().includes(q)
    }
    return true
  }), [validMatches, statusF, stageF, groupF, teamQ])

  const live     = filtered.filter(m => m.status === 'live')
  const upcoming = filtered.filter(m => m.status === 'upcoming')
  const finished = filtered.filter(m => m.status === 'finished')

  function canPredict(m) {
    if (m.status !== 'upcoming') return false
    try { return new Date() < new Date(`${m.match_date}T${m.match_time}`) } catch { return false }
  }

  function setDraft(id, field, val) {
    setDrafts(p => ({ ...p, [id]: { ...p[id], [field]: val } }))
  }

  async function handleSave(match) {
    const d = drafts[match.id] || {}
    const { ok, error } = await save(match.id, d.home, d.away, d.winner)
    if (ok) {
      setAlerts(a => ({ ...a, [match.id]: { type: 'success', msg: '✅ Pronostic enregistré !' } }))
      setDrafts(p => { const n={...p}; delete n[match.id]; return n })
    } else {
      setAlerts(a => ({ ...a, [match.id]: { type: 'error', msg: error } }))
    }
    setTimeout(() => setAlerts(a => { const n={...a}; delete n[match.id]; return n }), 4000)
  }

  function reset() { setStatusF('all'); setStageF('Tous'); setGroupF('Tous'); setTeamQ('') }

  if (loading && matches.length === 0) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="matches-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Calendrier des <span>Matchs</span></h1>
        <p className="page-sub">
          {validMatches.length} matchs · Pronostics verrouillés au coup d'envoi · Horaires en CET
          <span className={`api-dot ${apiStatus}`} style={{marginLeft:8}}/>
          {lastSync && ` Sync ${lastSync.toLocaleTimeString('fr-FR')}`}
        </p>
      </div>

      <div className="filters-panel card">
        <div className="filter-row">
          <span className="filter-lbl">Statut</span>
          <div className="filter-pills">
            {[['all','Tous'],['upcoming','À venir'],['live','🔴 En direct'],['finished','Terminés']].map(([v,l]) => (
              <button key={v} className={`fpill ${statusF===v?'active':''}`} onClick={()=>setStatusF(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-lbl">Phase</span>
          <div className="filter-pills">
            {STAGES.map(s => (
              <button key={s} className={`fpill ${stageF===s?'active':''}`}
                onClick={()=>{setStageF(s);setGroupF('Tous')}}>{s}</button>
            ))}
          </div>
        </div>
        {(stageF==='Tous'||stageF==='Phase de groupes') && groupNames.length > 2 && (
          <div className="filter-row">
            <span className="filter-lbl">Groupe</span>
            <div className="filter-pills">
              {groupNames.map(g => <button key={g} className={`fpill ${groupF===g?'active':''}`} onClick={()=>setGroupF(g)}>{g}</button>)}
            </div>
          </div>
        )}
        <div className="filter-row">
          <span className="filter-lbl">Équipe</span>
          <input className="team-search" placeholder="Rechercher une équipe..." value={teamQ} onChange={e=>setTeamQ(e.target.value)} />
          {(statusF!=='all'||stageF!=='Tous'||groupF!=='Tous'||teamQ) &&
            <button className="btn btn-ghost btn-sm" onClick={reset}>Réinitialiser</button>}
        </div>
      </div>

      <div className="results-count">{filtered.length} match{filtered.length!==1?'s':''} trouvé{filtered.length!==1?'s':''}</div>

      {live.length > 0 && (
        <section>
          <div className="section-label section-label-live"><span className="live-dot"/>En direct ({live.length})</div>
          <div className="matches-grid">{live.map(m=><MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false}/>)}</div>
        </section>
      )}
      {upcoming.length > 0 && (
        <section>
          <div className="section-label">À venir ({upcoming.length})</div>
          <div className="matches-grid">
            {upcoming.map(m=>(
              <MatchCard key={m.id} match={m} pred={predictions[m.id]}
                open={canPredict(m)} draft={drafts[m.id]||{}}
                onDraft={(f,v)=>setDraft(m.id,f,v)}
                onSubmit={()=>handleSave(m)} submitting={saving[m.id]}
                error={alerts[m.id]?.type==='error'?alerts[m.id].msg:null}
              />
            ))}
          </div>
        </section>
      )}
      {finished.length > 0 && (
        <section>
          <div className="section-label">Terminés ({finished.length})</div>
          <div className="matches-grid">{finished.map(m=><MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false}/>)}</div>
        </section>
      )}
      {filtered.length===0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>Aucun match ne correspond aux filtres.</p>
          <button className="btn btn-ghost" onClick={reset}>Réinitialiser les filtres</button>
        </div>
      )}
    </div>
  )
}
