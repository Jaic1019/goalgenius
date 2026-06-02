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
  const [drafts, setDrafts]   = useState({})
  const [alerts, setAlerts]   = useState({})
  const cd = useCountdown(WC_START)

  const todayStr = new Date().toISOString().slice(0, 10)
  const live   = matches.filter(m => m.status === 'live')
  const today  = matches.filter(m => m.match_date === todayStr && m.status !== 'live')
  const next   = matches.filter(m => m.status === 'upcoming').slice(0, 4)
  const recent = matches.filter(m => m.status === 'finished').slice(-3).reverse()

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
      setDrafts(p => { const n = {...p}; delete n[match.id]; return n })
    } else {
      setAlerts(a => ({ ...a, [match.id]: { type: 'error', msg: error } }))
    }
    setTimeout(() => setAlerts(a => { const n = {...a}; delete n[match.id]; return n }), 4000)
  }

  return (
    <div className="home page fade-up">

      {/* Hero */}
      <div className="hero">
        <div className="hero-glow" />
        <div className="hero-bg display">2026</div>
        <div className="hero-content">
          <div className="hero-brand">
            <img src="/mca-logo.png" alt="MCA Technology" className="hero-logo" />
            <span className="hero-presents">présente</span>
          </div>
          <h1 className="hero-title display">
            {cd.started ? '⚽ Tournoi en cours' : 'Coupe du Monde'} <span>2026</span>
          </h1>
          <p className="hero-sub">USA · Mexique · Canada · 11 Juin – 19 Juillet</p>

          {!cd.started && (
            <div className="countdown">
              {[['Jours',cd.days],['Heures',cd.hours],['Min',cd.minutes],['Sec',cd.seconds]].map(([l,v]) => (
                <div key={l} className="cd-block">
                  <div className="cd-n display">{String(v).padStart(2,'0')}</div>
                  <div className="cd-l">{l}</div>
                </div>
              ))}
            </div>
          )}

          <div className="hero-stats">
            {[['48','Équipes'],['104','Matchs'],['12','Groupes'],['16','Stades']].map(([n,l],i,arr) => (
              <span key={l} style={{display:'flex',alignItems:'center',gap:18}}>
                <div className="hs-item">
                  <span className="hs-n display">{n}</span>
                  <span className="hs-l">{l}</span>
                </div>
                {i < arr.length-1 && <div className="hs-div"/>}
              </span>
            ))}
          </div>
        </div>

        <div className="api-bar">
          <span className={`api-dot ${apiStatus}`}/>
          <span className="api-txt">
            {apiStatus === 'ok' ? 'Données en direct connectées'
            : apiStatus === 'warn' ? 'Mode dégradé — données locales'
            : apiStatus === 'error' ? 'API inaccessible — base de données locale utilisée'
            : 'Connexion...'}
          </span>
          {lastSync && <span className="api-sync">· Sync {lastSync.toLocaleTimeString('fr-FR')}</span>}
        </div>
      </div>

      {/* Live */}
      {live.length > 0 && (
        <section className="fade-up-2">
          <div className="section-label section-label-live"><span className="live-dot"/>En direct maintenant</div>
          <div className="matches-grid">
            {live.map(m => <MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false} />)}
          </div>
        </section>
      )}

      {/* Today */}
      {today.length > 0 && (
        <section className="fade-up-2">
          <div className="section-label">Matchs d'aujourd'hui</div>
          <div className="matches-grid">
            {today.map(m => (
              <MatchCard key={m.id} match={m} pred={predictions[m.id]}
                open={canPredict(m)} draft={drafts[m.id]||{}}
                onDraft={(f,v) => setDraft(m.id,f,v)}
                onSubmit={() => handleSave(m)} submitting={saving[m.id]}
                error={alerts[m.id]?.type==='error' ? alerts[m.id].msg : null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Next */}
      {next.length > 0 && (
        <section className="fade-up-3">
          <div className="section-label-row">
            <div className="section-label">Prochains matchs</div>
            <Link to="/matches" className="see-all">Voir tout →</Link>
          </div>
          <div className="matches-grid">
            {next.map(m => (
              <MatchCard key={m.id} match={m} pred={predictions[m.id]}
                open={canPredict(m)} draft={drafts[m.id]||{}}
                onDraft={(f,v) => setDraft(m.id,f,v)}
                onSubmit={() => handleSave(m)} submitting={saving[m.id]}
                error={alerts[m.id]?.type==='error' ? alerts[m.id].msg : null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <div className="section-label-row">
            <div className="section-label">Résultats récents</div>
            <Link to="/matches" className="see-all">Voir tout →</Link>
          </div>
          <div className="matches-grid">
            {recent.map(m => <MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false} />)}
          </div>
        </section>
      )}

      {loading && matches.length === 0 && (
        <div className="loading-screen" style={{minHeight:200}}>
          <div className="spinner"/>
          <span style={{color:'var(--text2)',fontSize:14,fontWeight:500}}>Chargement des matchs...</span>
        </div>
      )}

      {!loading && matches.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⚽</div>
          <p style={{fontSize:15,fontWeight:600}}>Aucun match disponible pour le moment</p>
          <p style={{fontSize:13}}>Les données sont synchronisées automatiquement depuis l'API</p>
        </div>
      )}
    </div>
  )
}
