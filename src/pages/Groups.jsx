import { useState, useMemo } from 'react'
import { useMatches } from '../hooks/useMatches'
import { resolveFlag } from '../lib/flags'
import './Groups.css'

function Flag({ url, name }) {
  const resolved = resolveFlag(url)
  if (!resolved) return <span className="gfb">{name?.[0]}</span>
  if (!resolved.startsWith('http')) return <span className="gflag-emoji">{resolved}</span>
  return <img src={resolved} alt={name} className="gflag" onError={e=>e.target.style.display='none'}/>
}

// ── Stage classification ──────────────────────────────────────────
function getStage(g) {
  if (!g) return 'group'
  const s = g.toLowerCase()
  if (s.includes('top 32')||s.includes('r32')) return 'top32'
  if (s.includes('top 16')||s.includes('r16')) return 'top16'
  if (s.includes('quart')||s.includes('qf')) return 'qf'
  if (s.includes('demi')||s.includes('semi')||s.includes('sf')) return 'sf'
  if (s.includes('3ème')||s.includes('3rd')||s.includes('third')) return 'third'
  if ((s.includes('final')||s.includes('finale'))&&!s.includes('demi')&&!s.includes('semi')&&!s.includes('quart')&&!s.includes('3')) return 'final'
  return 'group'
}

function isGroupStage(g) {
  if (!g) return false
  const s = g.trim().toLowerCase()
  const ko = ['r32','r16','qf','quarter','sf','semi','demi','final','3rd','third','top 32','top 16','quart','finale']
  if (ko.some(k=>s.includes(k))) return false
  if (/^group [a-l]$/i.test(g.trim())) return true
  if (/^groupe [a-l]$/i.test(g.trim())) return true
  if (/^[a-l]$/i.test(g.trim())) return true
  if (s.includes('group')||s.includes('groupe')) return true
  return false
}

function calcStandings(matches, group) {
  const gm = matches.filter(m => m.group_stage === group)
  const teams = {}
  for (const m of gm) {
    if (m.home_team && m.home_team.toUpperCase() !== 'TBD' && !teams[m.home_team])
      teams[m.home_team] = { name:m.home_team, flag:m.home_flag, p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 }
    if (m.away_team && m.away_team.toUpperCase() !== 'TBD' && !teams[m.away_team])
      teams[m.away_team] = { name:m.away_team, flag:m.away_flag, p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 }
  }
  for (const m of gm.filter(m=>m.status==='finished'&&m.home_score!=null)) {
    const h=teams[m.home_team], a=teams[m.away_team]
    if (!h||!a) continue
    h.p++;a.p++;h.gf+=m.home_score;h.ga+=m.away_score;a.gf+=m.away_score;a.ga+=m.home_score
    if (m.home_score>m.away_score){h.w++;h.pts+=3;a.l++}
    else if(m.home_score<m.away_score){a.w++;a.pts+=3;h.l++}
    else{h.d++;a.d++;h.pts++;a.pts++}
  }
  return Object.values(teams).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf)
}

const KNOCKOUT_STAGES = [
  { key:'top32', label:'Top 32', group_stage:'Top 32' },
  { key:'top16', label:'Top 16', group_stage:'Top 16' },
  { key:'qf',    label:'Quarts de finale', group_stage:'Quarts de finale' },
  { key:'sf',    label:'Demi-finales', group_stage:'Demi-finales' },
  { key:'third', label:'3ème Place', group_stage:'3ème Place' },
  { key:'final', label:'Finale', group_stage:'Finale' },
]

export default function Groups() {
  const { matches, loading } = useMatches()
  const [active, setActive] = useState(null)

  const groupNames = useMemo(() => {
    const names = matches.filter(m=>isGroupStage(m.group_stage)).map(m=>m.group_stage).filter(Boolean)
    return [...new Set(names)].sort()
  }, [matches])

  const availableKO = useMemo(() => {
    return KNOCKOUT_STAGES.filter(s =>
      matches.some(m => m.group_stage === s.group_stage)
    )
  }, [matches])

  const allTabs = [...groupNames, ...availableKO.map(s=>s.group_stage)]
  const current = active || groupNames[0]
  const currentIsGroup = isGroupStage(current)
  const standings = useMemo(()=>currentIsGroup?calcStandings(matches,current):[], [matches,current,currentIsGroup])
  const matchList = useMemo(()=>
    matches.filter(m=>m.group_stage===current)
      .sort((a,b)=>a.match_date?.localeCompare(b.match_date)||a.match_time?.localeCompare(b.match_time)),
    [matches,current])

  if (loading&&matches.length===0) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="groups-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Classements <span>par Groupe</span></h1>
        <p className="page-sub">Mis à jour en temps réel · Les 2 premiers de chaque groupe se qualifient</p>
      </div>

      {/* Tabs — groups + knockout stages */}
      <div className="group-tabs">
        {groupNames.map(g=>(
          <button key={g} className={`gtab ${current===g?'active':''}`} onClick={()=>setActive(g)}>{g}</button>
        ))}
        {availableKO.length>0 && <div className="gtab-divider"/>}
        {availableKO.map(s=>(
          <button key={s.key} className={`gtab gtab-ko ${current===s.group_stage?'active':''}`}
            onClick={()=>setActive(s.group_stage)}>{s.label}</button>
        ))}
      </div>

      {current && (
        <div className="group-content">
          {/* Group standings */}
          {currentIsGroup && standings.length>0 && (
            <div className="st-table">
              <div className="st-head">
                <span className="st-rank-h">#</span>
                <span>Équipe</span>
                <span className="ar">J</span><span className="ar">G</span>
                <span className="ar">N</span><span className="ar">P</span>
                <span className="ar">BP</span><span className="ar">BC</span>
                <span className="ar">DB</span><span className="ar st-pts-h">Pts</span>
              </div>
              {standings.map((t,i)=>(
                <div key={t.name} className={`st-row ${i<2?'qualified':''}`}>
                  <span className="st-rk">{i+1}</span>
                  <span className="st-team">
                    <Flag url={t.flag} name={t.name}/>
                    <span className="st-tn">{t.name}</span>
                    {i<2&&<span className="q-badge">Q</span>}
                  </span>
                  <span className="ar st-n">{t.p}</span>
                  <span className="ar st-n">{t.w}</span>
                  <span className="ar st-n">{t.d}</span>
                  <span className="ar st-n">{t.l}</span>
                  <span className="ar st-n">{t.gf}</span>
                  <span className="ar st-n">{t.ga}</span>
                  <span className={`ar st-n ${t.gf-t.ga>0?'pos':t.gf-t.ga<0?'neg':''}`}>
                    {t.gf-t.ga>0?'+':''}{t.gf-t.ga}
                  </span>
                  <span className="ar st-pts">{t.pts}</span>
                </div>
              ))}
            </div>
          )}

          {/* Match list — groups + knockout */}
          <div className="gm-block">
            <div className="section-label">
              {currentIsGroup?`Matchs — ${current}`:`Tableau — ${current}`}
            </div>
            <div className="gm-list">
              {matchList.length===0&&(
                <div className="empty-state" style={{padding:'20px'}}>
                  <p>Aucun match disponible pour cette phase.</p>
                </div>
              )}
              {matchList.map(m=>{
                const isTBD = !m.home_team||!m.away_team||
                  m.home_team.toUpperCase()==='TBD'||m.away_team.toUpperCase()==='TBD'
                return (
                  <div key={m.id} className={`gm-row ${m.status}${isTBD?' gm-tbd':''}`}>
                    <div className="gm-team home">
                      {!isTBD&&<Flag url={m.home_flag} name={m.home_team}/>}
                      <span>{isTBD?'À déterminer':m.home_team}</span>
                    </div>
                    <div className="gm-mid">
                      {m.home_score!=null
                        ?<span className={`gm-sc display ${m.status==='live'?'gm-live':''}`}>
                           {m.home_score}–{m.away_score}
                           {m.home_penalty!=null&&<span className="gm-pen"> (pen. {m.home_penalty}–{m.away_penalty})</span>}
                         </span>
                        :<span className="gm-dt">{m.match_date?.slice(5)} · {m.match_time?.slice(0,5)} CEST</span>
                      }
                      <span className={`badge ${m.status==='live'?'badge-red':m.status==='finished'?'badge-gray':'badge-purple'}`}
                        style={{fontSize:9}}>
                        {m.status==='live'?'🔴 Live':m.status==='finished'?'Terminé':'À venir'}
                      </span>
                    </div>
                    <div className="gm-team away">
                      <span>{isTBD?'À déterminer':m.away_team}</span>
                      {!isTBD&&<Flag url={m.away_flag} name={m.away_team}/>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {groupNames.length===0&&!loading&&(
        <div className="empty-state"><div className="empty-icon">📊</div><p>Les groupes apparaîtront une fois les matchs chargés.</p></div>
      )}
    </div>
  )
}
