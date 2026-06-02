import { useState, useMemo } from 'react'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import MatchCard from '../components/MatchCard'
import './Matches.css'

const STAGES = ['All','Group Stage','Round of 32','Round of 16','Quarter-finals','Semi-finals','Final']

function stageBucket(g) {
  if (!g) return 'Group Stage'
  const s = g.toLowerCase()
  if (s.includes('r32') || s.includes('round of 32') || s.includes('32')) return 'Round of 32'
  if (s.includes('r16') || s.includes('round of 16') || (s.includes('16') && !s.includes('group'))) return 'Round of 16'
  if (s.includes('qf') || s.includes('quarter')) return 'Quarter-finals'
  if (s.includes('sf') || s.includes('semi')) return 'Semi-finals'
  if ((s.includes('final') || s.includes('finale')) && !s.includes('semi') && !s.includes('quarter') && !s.includes('3rd')) return 'Final'
  if (s.includes('3rd') || s.includes('third')) return 'Third Place'
  return 'Group Stage'
}

export default function Matches() {
  const { matches, loading, apiStatus, lastSync } = useMatches()
  const { predictions, saving, save } = usePredictions()
  const [drafts, setDrafts] = useState({})
  const [alert, setAlert] = useState(null)
  const [statusF, setStatusF] = useState('all')
  const [stageF,  setStageF]  = useState('All')
  const [groupF,  setGroupF]  = useState('All')
  const [teamQ,   setTeamQ]   = useState('')

  const groupNames = useMemo(() => ['All', ...new Set(
    matches.filter(m => stageBucket(m.group_stage) === 'Group Stage')
           .map(m => m.group_stage).filter(Boolean).sort()
  )], [matches])

  const filtered = useMemo(() => matches.filter(m => {
    if (statusF !== 'all' && m.status !== statusF) return false
    if (stageF  !== 'All' && stageBucket(m.group_stage) !== stageF) return false
    if (groupF  !== 'All' && m.group_stage !== groupF) return false
    if (teamQ.trim()) {
      const q = teamQ.trim().toLowerCase()
      return m.home_team?.toLowerCase().includes(q) || m.away_team?.toLowerCase().includes(q)
    }
    return true
  }), [matches, statusF, stageF, groupF, teamQ])

  const live     = filtered.filter(m => m.status === 'live')
  const upcoming = filtered.filter(m => m.status === 'upcoming')
  const finished = filtered.filter(m => m.status === 'finished')

  function canPredict(m) {
    if (m.status !== 'upcoming') return false
    try { return new Date() < new Date(`${m.match_date}T${m.match_time}:00`) } catch { return false }
  }
  function setDraft(id, side, val) {
    setDrafts(p => ({ ...p, [id]: { ...p[id], [side]: val===''?'':Math.max(0,parseInt(val)||0) } }))
  }
  async function handleSave(match) {
    const d = drafts[match.id] || {}
    if (d.home===undefined||d.home===''||d.away===undefined||d.away==='') { showAlert('Enter both scores first.','error'); return }
    const ok = await save(match.id, d.home, d.away)
    if (ok) { showAlert('Prediction saved! 🎯','success'); setDrafts(p=>{const n={...p};delete n[match.id];return n}) }
    else showAlert('Failed to save.','error')
  }
  function showAlert(msg,type) { setAlert({msg,type}); setTimeout(()=>setAlert(null),3000) }
  function resetFilters() { setStatusF('all'); setStageF('All'); setGroupF('All'); setTeamQ('') }

  if (loading && matches.length===0) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="matches-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Match <span>Schedule</span></h1>
        <p className="page-sub">
          {matches.length} matches · Predictions lock at kick-off · Times in CET
          {lastSync && ` · Synced ${lastSync.toLocaleTimeString('en-GB')}`}
          <span className={`api-dot ${apiStatus}`} style={{marginLeft:8,display:'inline-block'}}/>
        </p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      <div className="filters-panel card">
        <div className="filter-row">
          <span className="filter-lbl">Status</span>
          <div className="filter-pills">
            {[['all','All'],['upcoming','Upcoming'],['live','🔴 Live'],['finished','Finished']].map(([v,l]) => (
              <button key={v} className={`fpill ${statusF===v?'active':''}`} onClick={()=>setStatusF(v)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-lbl">Stage</span>
          <div className="filter-pills">
            {STAGES.map(s => (
              <button key={s} className={`fpill ${stageF===s?'active':''}`} onClick={()=>{setStageF(s);setGroupF('All')}}>{s}</button>
            ))}
          </div>
        </div>
        {(stageF==='All'||stageF==='Group Stage') && groupNames.length > 2 && (
          <div className="filter-row">
            <span className="filter-lbl">Group</span>
            <div className="filter-pills">
              {groupNames.map(g => <button key={g} className={`fpill ${groupF===g?'active':''}`} onClick={()=>setGroupF(g)}>{g}</button>)}
            </div>
          </div>
        )}
        <div className="filter-row">
          <span className="filter-lbl">Team</span>
          <input className="team-search" placeholder="Search by team name…" value={teamQ} onChange={e=>setTeamQ(e.target.value)} />
          {(statusF!=='all'||stageF!=='All'||groupF!=='All'||teamQ) &&
            <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Clear</button>}
        </div>
      </div>

      <div className="results-count">{filtered.length} match{filtered.length!==1?'es':''} found</div>

      {live.length > 0 && (
        <section>
          <div className="section-label section-label-live"><span className="live-dot"/>Live Now ({live.length})</div>
          <div className="matches-grid">{live.map(m=><MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false}/>)}</div>
        </section>
      )}
      {upcoming.length > 0 && (
        <section>
          <div className="section-label">Upcoming ({upcoming.length})</div>
          <div className="matches-grid">
            {upcoming.map(m=>(
              <MatchCard key={m.id} match={m} pred={predictions[m.id]}
                open={canPredict(m)} draft={drafts[m.id]||{}}
                onDraft={(s,v)=>setDraft(m.id,s,v)} onSubmit={()=>handleSave(m)} submitting={saving[m.id]}/>
            ))}
          </div>
        </section>
      )}
      {finished.length > 0 && (
        <section>
          <div className="section-label">Finished ({finished.length})</div>
          <div className="matches-grid">{finished.map(m=><MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false}/>)}</div>
        </section>
      )}
      {filtered.length===0 && !loading && (
        <div className="empty-state"><div className="empty-icon">🔍</div><p>No matches match these filters.</p><button className="btn btn-ghost" onClick={resetFilters}>Reset filters</button></div>
      )}
    </div>
  )
}
