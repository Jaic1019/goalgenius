import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import MatchCard from '../components/MatchCard'
import './Home.css'

const WC_START = new Date('2026-06-11T19:00:00+02:00')

function useCountdown(target) {
  const [diff, setDiff] = useState(target - Date.now())
  useEffect(() => {
    const t = setInterval(() => setDiff(target - Date.now()), 1000)
    return () => clearInterval(t)
  }, [target])
  const ms = Math.max(0, diff)
  return {
    days:    Math.floor(ms / 86400000),
    hours:   Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    started: diff <= 0,
  }
}

export default function Home() {
  const { matches, loading, apiStatus, lastSync } = useMatches()
  const { predictions, saving, save } = usePredictions()
  const [drafts, setDrafts] = useState({})
  const [alert, setAlert] = useState(null)
  const cd = useCountdown(WC_START)

  const todayStr = new Date().toISOString().slice(0, 10)
  const live    = matches.filter(m => m.status === 'live')
  const today   = matches.filter(m => m.match_date === todayStr && m.status !== 'live')
  const next    = matches.filter(m => m.status === 'upcoming').slice(0, 3)
  const recent  = matches.filter(m => m.status === 'finished').slice(-3).reverse()

  function canPredict(m) {
    if (m.status !== 'upcoming') return false
    try { return new Date() < new Date(`${m.match_date}T${m.match_time}:00`) } catch { return false }
  }

  function setDraft(id, side, val) {
    setDrafts(p => ({ ...p, [id]: { ...p[id], [side]: val === '' ? '' : Math.max(0, parseInt(val)||0) } }))
  }

  async function handleSave(match) {
    const d = drafts[match.id] || {}
    if (d.home === undefined || d.home === '' || d.away === undefined || d.away === '') {
      showAlert('Enter both scores first.', 'error'); return
    }
    const ok = await save(match.id, d.home, d.away)
    if (ok) { showAlert('Prediction saved! 🎯', 'success'); setDrafts(p => { const n={...p}; delete n[match.id]; return n }) }
    else showAlert('Failed to save. Try again.', 'error')
  }

  function showAlert(msg, type) { setAlert({msg,type}); setTimeout(()=>setAlert(null),3000) }

  return (
    <div className="home page fade-up">
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      {/* Hero */}
      <div className="hero">
        <div className="hero-glow" />
        <div className="hero-bg display">2026</div>
        <div className="hero-content">
          <div className="hero-brand">
            <img src="/mca-logo.png" alt="MCA Technology" className="hero-mca-logo" />
            <span className="hero-presents">presents</span>
          </div>
          <h1 className="hero-title display">
            {cd.started ? '⚽ Tournament Underway' : 'World Cup'} <span>2026</span>
          </h1>
          <p className="hero-sub">USA · Mexico · Canada · June 11 – July 19</p>

          {!cd.started && (
            <div className="countdown">
              {[['days',cd.days],['hours',cd.hours],['min',cd.minutes],['sec',cd.seconds]].map(([l,v]) => (
                <div key={l} className="cd-block">
                  <div className="cd-n display">{String(v).padStart(2,'0')}</div>
                  <div className="cd-l">{l}</div>
                </div>
              ))}
            </div>
          )}

          <div className="hero-stats">
            {[['48','Teams'],['104','Matches'],['12','Groups'],['16','Stadiums']].map(([n,l],i) => (
              <>
                {i > 0 && <div key={`div-${l}`} className="hs-div"/>}
                <div key={l} className="hs-item">
                  <span className="hs-n display">{n}</span>
                  <span className="hs-l">{l}</span>
                </div>
              </>
            ))}
          </div>
        </div>

        {/* API status */}
        <div className="api-status-bar">
          <div className={`api-dot ${apiStatus}`} />
          <span>{apiStatus === 'ok' ? 'Live data connected' : apiStatus === 'warn' ? 'Using cached data' : 'API unreachable — using database'}</span>
          {lastSync && <span>· Last sync {lastSync.toLocaleTimeString('en-GB')}</span>}
        </div>
      </div>

      {/* Live */}
      {live.length > 0 && (
        <section className="fade-up-2">
          <div className="section-label section-label-live"><span className="live-dot"/>Live Now</div>
          <div className="matches-grid">
            {live.map(m => <MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false} />)}
          </div>
        </section>
      )}

      {/* Today */}
      {today.length > 0 && (
        <section className="fade-up-2">
          <div className="section-label">Today's Matches</div>
          <div className="matches-grid">
            {today.map(m => (
              <MatchCard key={m.id} match={m} pred={predictions[m.id]}
                open={canPredict(m)} draft={drafts[m.id]||{}}
                onDraft={(s,v)=>setDraft(m.id,s,v)} onSubmit={()=>handleSave(m)} submitting={saving[m.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Next */}
      {next.length > 0 && (
        <section className="fade-up-3">
          <div className="section-label-row">
            <div className="section-label">Next Matches</div>
            <Link to="/matches" className="see-all">View all →</Link>
          </div>
          <div className="matches-grid">
            {next.map(m => (
              <MatchCard key={m.id} match={m} pred={predictions[m.id]}
                open={canPredict(m)} draft={drafts[m.id]||{}}
                onDraft={(s,v)=>setDraft(m.id,s,v)} onSubmit={()=>handleSave(m)} submitting={saving[m.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <div className="section-label-row">
            <div className="section-label">Recent Results</div>
            <Link to="/matches" className="see-all">View all →</Link>
          </div>
          <div className="matches-grid">
            {recent.map(m => <MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false} />)}
          </div>
        </section>
      )}

      {loading && matches.length === 0 && (
        <div className="loading-screen" style={{minHeight:200}}>
          <div className="spinner"/>
          <span style={{color:'var(--text2)',fontSize:14}}>Loading matches…</span>
        </div>
      )}
    </div>
  )
}
