import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMatches } from '../hooks/useMatches'
import { usePredictions } from '../hooks/usePredictions'
import MatchCard from '../components/MatchCard'
import { isPredictionOpen } from '../lib/timeUtils'
import './Home.css'

const WC_START = new Date('2026-06-11T19:00:00+02:00')

function useCountdown(target) {
  const [diff, setDiff] = useState(target - Date.now())
  useEffect(() => {
    const t = setInterval(()=>setDiff(target-Date.now()),1000)
    return ()=>clearInterval(t)
  }, [target])
  const ms = Math.max(0,diff)
  return { days:Math.floor(ms/86400000), hours:Math.floor((ms%86400000)/3600000), minutes:Math.floor((ms%3600000)/60000), seconds:Math.floor((ms%60000)/1000), started:diff<=0 }
}

T${m.match_time?.slice(0,5)}:00`) } catch { return false }
}

export default function Home() {
  const { matches, loading, apiStatus, lastSync } = useMatches()
  const { predictions, saving, save } = usePredictions()
  const [drafts, setDrafts]     = useState({})
  const [alerts, setAlerts]     = useState({})
  const [justSaved, setJustSaved] = useState({})
  const cd = useCountdown(WC_START)

  const todayStr = new Date().toISOString().slice(0,10)
  const live   = matches.filter(m=>m.status==='live')
  const today  = matches.filter(m=>m.match_date===todayStr&&m.status!=='live')
  const next   = matches.filter(m=>m.status==='upcoming'&&m.home_team?.toUpperCase()!=='TBD'&&m.away_team?.toUpperCase()!=='TBD').slice(0,4)
  const recent = matches.filter(m=>m.status==='finished').slice(-3).reverse()

  function setDraft(id, field, val) {
    setAlerts(a=>{const n={...a};delete n[id];return n})
    setDrafts(p=>({...p,[id]:{...p[id],[field]:val}}))
  }

  async function handleSave(match) {
    const d = drafts[match.id]||{}
    const isKO = isKnockoutMatch(match.group_stage)
    const {ok, error, isUpdate} = await save(match.id, d.home, d.away, d.winner, isKO)
    if (ok) {
      const wl = d.winner==='home'?match.home_team:d.winner==='away'?match.away_team:'Match nul'
      const msg = isUpdate
        ? `✏️ Pronostic mis à jour : ${d.home}–${d.away} · ${wl}`
        : `✅ Pronostic enregistré : ${d.home}–${d.away} · ${wl} · Modifiable avant le coup d'envoi.`
      setAlerts(a=>({...a,[match.id]:{type:'success',msg}}))
      setJustSaved(j=>({...j,[match.id]:true}))
      setDrafts(p=>{const n={...p};delete n[match.id];return n})
      setTimeout(()=>setJustSaved(j=>{const n={...j};delete n[match.id];return n}), 2000)
      setTimeout(()=>setAlerts(a=>{const n={...a};delete n[match.id];return n}), 8000)
    } else {
      setAlerts(a=>({...a,[match.id]:{type:'error',msg:error||'Erreur, réessayez.'}}))
      setTimeout(()=>setAlerts(a=>{const n={...a};delete n[match.id];return n}), 5000)
    }
  }

  return (
    <div className="home page fade-up">
      {/* Hero */}
      <div className="hero">
        <div className="hero-glow"/>
        <div className="hero-bg display">2026</div>
        <div className="hero-content">
          <div className="hero-brand">
            <img src="/mca-logo.png" alt="MCA Technology" className="hero-logo"/>
            <span className="hero-presents">présente</span>
          </div>
          <h1 className="hero-title display">{cd.started?'⚽ Tournoi en cours':'Coupe du Monde'} <span>2026</span></h1>
          <p className="hero-sub">USA · Mexique · Canada · 11 Juin – 19 Juillet</p>
          {!cd.started && (
            <div className="countdown">
              {[['Jours',cd.days],['Heures',cd.hours],['Min',cd.minutes],['Sec',cd.seconds]].map(([l,v])=>(
                <div key={l} className="cd-block"><div className="cd-n display">{String(v).padStart(2,'0')}</div><div className="cd-l">{l}</div></div>
              ))}
            </div>
          )}
          <div className="hero-stats">
            {[['48','Équipes'],['104','Matchs'],['12','Groupes'],['16','Stades']].map(([n,l],i,arr)=>(
              <span key={l} style={{display:'flex',alignItems:'center',gap:18}}>
                <div className="hs-item"><span className="hs-n display">{n}</span><span className="hs-l">{l}</span></div>
                {i<arr.length-1&&<div className="hs-div"/>}
              </span>
            ))}
          </div>
        </div>
        <div className="api-bar">
          <span className={`api-dot ${apiStatus}`}/>
          <span className="api-txt">
            {apiStatus==='ok'?'Données en direct connectées'
            :apiStatus==='warn'?'Mode dégradé — données locales'
            :apiStatus==='error'?'API inaccessible — base de données locale utilisée'
            :'Connexion...'}
          </span>
          {lastSync&&<span className="api-sync">· Sync {lastSync.toLocaleTimeString('fr-FR')}</span>}
        </div>
      </div>

      {live.length>0&&(
        <section className="fade-up-2">
          <div className="section-label section-label-live"><span className="live-dot"/>En direct maintenant</div>
          <div className="matches-grid">{live.map(m=><MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false}/>)}</div>
        </section>
      )}
      {today.length>0&&(
        <section className="fade-up-2">
          <div className="section-label">Matchs d'aujourd'hui</div>
          <div className="matches-grid">
            {today.map(m=>(
              <MatchCard key={m.id} match={m} pred={predictions[m.id]}
                open={isPredictionOpen(m)} draft={drafts[m.id]||{}}
                onDraft={(f,v)=>setDraft(m.id,f,v)} onSubmit={()=>handleSave(m)} submitting={saving[m.id]}
                error={alerts[m.id]?.type==='error'?alerts[m.id].msg:null}
                justSaved={justSaved[m.id]||false}
              />
            ))}
          </div>
        </section>
      )}
      {next.length>0&&(
        <section className="fade-up-3">
          <div className="section-label-row">
            <div className="section-label">Prochains matchs</div>
            <Link to="/matches" className="see-all">Voir tout →</Link>
          </div>
          <div className="matches-grid">
            {next.map(m=>(
              <MatchCard key={m.id} match={m} pred={predictions[m.id]}
                open={isPredictionOpen(m)} draft={drafts[m.id]||{}}
                onDraft={(f,v)=>setDraft(m.id,f,v)} onSubmit={()=>handleSave(m)} submitting={saving[m.id]}
                error={alerts[m.id]?.type==='error'?alerts[m.id].msg:null}
                justSaved={justSaved[m.id]||false}
              />
            ))}
          </div>
        </section>
      )}
      {recent.length>0&&(
        <section>
          <div className="section-label-row">
            <div className="section-label">Résultats récents</div>
            <Link to="/matches" className="see-all">Voir tout →</Link>
          </div>
          <div className="matches-grid">{recent.map(m=><MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false}/>)}</div>
        </section>
      )}
      {loading&&matches.length===0&&<div className="loading-screen" style={{minHeight:200}}><div className="spinner"/><span style={{color:'var(--text2)',fontSize:14,fontWeight:500}}>Chargement des matchs...</span></div>}
      {!loading&&matches.length===0&&<div className="empty-state"><div className="empty-icon">⚽</div><p>Aucun match disponible pour le moment</p><p style={{fontSize:13}}>Les données sont synchronisées automatiquement depuis l'API</p></div>}
    </div>
  )
}
