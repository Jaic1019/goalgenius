import { useState, useMemo } from 'react'
import { useMatches } from '../hooks/useMatches'
import './Groups.css'

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


// ── Flag ──────────────────────────────────────────────────────────
function Flag({ url, name }) {
  const [err, setErr] = useState(false)
  const resolved = resolveFlag(url)
  const fb = <span className="gfb">{name?.[0]}</span>
  if (!resolved) return fb
  if (!resolved.startsWith('http')) return <span className="gflag-emoji">{resolved}</span>
  if (err) return fb
  return <img src={resolved} alt={name} className="gflag" onError={() => setErr(true)} />
}

// ── Group stage filter — accepts A, Group A, Groupe A etc ─────────
function isGroupStage(g) {
  if (!g) return false
  const s = g.trim().toLowerCase()
  const knockouts = ['r32','r16','qf','quarter','sf','semi','demi','final','3rd','third','top 32','top 16','quart','finale']
  if (knockouts.some(k => s.includes(k))) return false
  if (/^group [a-l]$/i.test(g.trim())) return true
  if (/^groupe [a-l]$/i.test(g.trim())) return true
  if (/^[a-l]$/i.test(g.trim())) return true
  if (s.includes('group') || s.includes('groupe')) return true
  return false
}

// ── Standings calculator ──────────────────────────────────────────
function calcStandings(matches, group) {
  const gm = matches.filter(m => m.group_stage === group)
  const teams = {}

  for (const m of gm) {
    if (m.home_team && m.home_team.toUpperCase() !== 'TBD' && !teams[m.home_team])
      teams[m.home_team] = { name: m.home_team, flag: m.home_flag, p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 }
    if (m.away_team && m.away_team.toUpperCase() !== 'TBD' && !teams[m.away_team])
      teams[m.away_team] = { name: m.away_team, flag: m.away_flag, p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 }
  }

  for (const m of gm.filter(m => m.status === 'finished' && m.home_score != null)) {
    const h = teams[m.home_team], a = teams[m.away_team]
    if (!h || !a) continue
    h.p++; a.p++
    h.gf += m.home_score; h.ga += m.away_score
    a.gf += m.away_score; a.ga += m.home_score
    if (m.home_score > m.away_score)      { h.w++; h.pts += 3; a.l++ }
    else if (m.home_score < m.away_score) { a.w++; a.pts += 3; h.l++ }
    else                                   { h.d++; a.d++; h.pts++; a.pts++ }
  }

  return Object.values(teams).sort((a,b) =>
    b.pts - a.pts || (b.gf-b.ga) - (a.gf-a.ga) || b.gf - a.gf
  )
}

// ── Component ─────────────────────────────────────────────────────
export default function Groups() {
  const { matches, loading } = useMatches()
  const [active, setActive] = useState(null)

  const groupNames = useMemo(() => {
    const names = matches
      .filter(m => isGroupStage(m.group_stage))
      .map(m => m.group_stage)
      .filter(Boolean)
    return [...new Set(names)].sort()
  }, [matches])

  const current    = active || groupNames[0]
  const standings  = useMemo(() => current ? calcStandings(matches, current) : [], [matches, current])
  const groupMatchesList = useMemo(() =>
    matches
      .filter(m => m.group_stage === current)
      .sort((a,b) => a.match_date?.localeCompare(b.match_date) || a.match_time?.localeCompare(b.match_time)),
    [matches, current])

  if (loading && matches.length === 0)
    return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="groups-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Classements <span>par Groupe</span></h1>
        <p className="page-sub">
          Mis à jour en temps réel · Les 2 premiers de chaque groupe se qualifient ·
          Les scores se mettent à jour automatiquement via l'API
        </p>
      </div>

      {/* Group tabs */}
      <div className="group-tabs">
        {groupNames.map(g => (
          <button key={g}
            className={`gtab ${(active || groupNames[0]) === g ? 'active' : ''}`}
            onClick={() => setActive(g)}>
            {g}
          </button>
        ))}
      </div>

      {current && standings.length > 0 && (
        <div className="group-content">

          {/* Standings table — always visible */}
          <div className="st-table">
            <div className="st-head">
              <span className="st-rank-h">#</span>
              <span>Équipe</span>
              <span className="ar">J</span>
              <span className="ar">G</span>
              <span className="ar">N</span>
              <span className="ar">P</span>
              <span className="ar">BP</span>
              <span className="ar">BC</span>
              <span className="ar">DB</span>
              <span className="ar st-pts-h">Pts</span>
            </div>
            {standings.map((t, i) => (
              <div key={t.name} className={`st-row ${i < 2 ? 'qualified' : ''}`}>
                <span className="st-rk">{i + 1}</span>
                <span className="st-team">
                  <Flag url={t.flag} name={t.name} />
                  <span className="st-tn">{t.name}</span>
                  {i < 2 && <span className="q-badge">Q</span>}
                </span>
                <span className="ar st-n">{t.p}</span>
                <span className="ar st-n">{t.w}</span>
                <span className="ar st-n">{t.d}</span>
                <span className="ar st-n">{t.l}</span>
                <span className="ar st-n">{t.gf}</span>
                <span className="ar st-n">{t.ga}</span>
                <span className={`ar st-n ${t.gf-t.ga>0?'pos':t.gf-t.ga<0?'neg':''}`}>
                  {t.gf-t.ga > 0 ? '+' : ''}{t.gf - t.ga}
                </span>
                <span className="ar st-pts">{t.pts}</span>
              </div>
            ))}
          </div>

          {/* Match list — shows score when available, date when not */}
          <div className="gm-block">
            <div className="section-label">Matchs — {current}</div>
            <div className="gm-list">
              {groupMatchesList.map(m => (
                <div key={m.id} className={`gm-row ${m.status}`}>
                  <div className="gm-team home">
                    <Flag url={m.home_flag} name={m.home_team} />
                    <span>{m.home_team || 'À déterminer'}</span>
                  </div>
                  <div className="gm-mid">
                    {/* Show score if available (live or finished), date if not */}
                    {m.home_score != null ? (
                      <span className={`gm-sc display ${m.status === 'live' ? 'gm-live' : ''}`}>
                        {m.home_score}–{m.away_score}
                      </span>
                    ) : (
                      <span className="gm-dt">
                        {m.match_date?.slice(5)} · {m.match_time?.slice(0, 5)}
                      </span>
                    )}
                    <span className={`badge ${m.status === 'live' ? 'badge-red' : m.status === 'finished' ? 'badge-gray' : 'badge-purple'}`}
                      style={{ fontSize: 9 }}>
                      {m.status === 'live' ? '🔴 Live' : m.status === 'finished' ? 'Terminé' : 'À venir'}
                    </span>
                  </div>
                  <div className="gm-team away">
                    <span>{m.away_team || 'À déterminer'}</span>
                    <Flag url={m.away_flag} name={m.away_team} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {groupNames.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>Les groupes apparaîtront une fois les matchs chargés.</p>
        </div>
      )}
    </div>
  )
}
