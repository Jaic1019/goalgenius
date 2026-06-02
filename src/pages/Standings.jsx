import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Standings.css'

export default function Standings() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState(null)

  useEffect(() => {
    supabase.from('matches').select('*').order('match_date').then(({ data }) => {
      setMatches(data || [])
      if (data?.length) {
        const firstGroup = [...new Set(data.map(m => m.group_stage).filter(Boolean))][0]
        setActiveGroup(firstGroup)
      }
      setLoading(false)
    })
  }, [])

  const groups = [...new Set(matches.map(m => m.group_stage).filter(Boolean))]

  // Calculate standings for a group
  function calcStandings(groupName) {
    const groupMatches = matches.filter(m => m.group_stage === groupName && m.status === 'finished' && m.home_score !== null)
    const teamMap = {}

    for (const m of matches.filter(m => m.group_stage === groupName)) {
      if (!teamMap[m.home_team]) teamMap[m.home_team] = { name: m.home_team, flag: m.home_flag, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }
      if (!teamMap[m.away_team]) teamMap[m.away_team] = { name: m.away_team, flag: m.away_flag, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }
    }

    for (const m of groupMatches) {
      const h = teamMap[m.home_team]
      const a = teamMap[m.away_team]
      if (!h || !a) continue
      h.p++; a.p++
      h.gf += m.home_score; h.ga += m.away_score
      a.gf += m.away_score; a.ga += m.home_score
      if (m.home_score > m.away_score) { h.w++; h.pts += 3; a.l++ }
      else if (m.home_score < m.away_score) { a.w++; a.pts += 3; h.l++ }
      else { h.d++; a.d++; h.pts++; a.pts++ }
    }

    return Object.values(teamMap).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="standings-page fade-up">
      <div className="page-header">
        <h1 className="display page-title">Tableaux de groupes</h1>
        <p className="page-sub">Classements calculés à partir des résultats enregistrés.</p>
      </div>

      <div className="group-tabs">
        {groups.map(g => (
          <button key={g} className={`group-tab ${activeGroup === g ? 'active' : ''}`}
            onClick={() => setActiveGroup(g)}>{g}</button>
        ))}
      </div>

      {activeGroup && (() => {
        const standings = calcStandings(activeGroup)
        const groupMatches = matches.filter(m => m.group_stage === activeGroup)
        return (
          <div className="group-content">
            <div className="standings-table">
              <div className="st-head">
                <span>Équipe</span>
                <span className="align-right">J</span>
                <span className="align-right">G</span>
                <span className="align-right">N</span>
                <span className="align-right">P</span>
                <span className="align-right">Buts</span>
                <span className="align-right">Diff</span>
                <span className="align-right">Pts</span>
              </div>
              {standings.map((t, i) => (
                <div key={t.name} className={`st-row ${i < 2 ? 'qualified' : ''}`}>
                  <span className="st-team">
                    <span className="st-rank">{i + 1}</span>
                    <span className="st-flag">{t.flag}</span>
                    <span className="st-name">{t.name}</span>
                    {i < 2 && <span className="q-badge">Q</span>}
                  </span>
                  <span className="align-right st-num">{t.p}</span>
                  <span className="align-right st-num">{t.w}</span>
                  <span className="align-right st-num">{t.d}</span>
                  <span className="align-right st-num">{t.l}</span>
                  <span className="align-right st-num">{t.gf}:{t.ga}</span>
                  <span className={`align-right st-num ${t.gf - t.ga > 0 ? 'pos' : t.gf - t.ga < 0 ? 'neg' : ''}`}>
                    {t.gf - t.ga > 0 ? '+' : ''}{t.gf - t.ga}
                  </span>
                  <span className="align-right st-pts">{t.pts}</span>
                </div>
              ))}
            </div>

            <div className="group-matches-title">Matchs du {activeGroup}</div>
            <div className="group-matches">
              {groupMatches.map(m => (
                <div key={m.id} className={`gm-row ${m.status}`}>
                  <span className="gm-team home">{m.home_flag} {m.home_team}</span>
                  <span className="gm-score">
                    {m.home_score !== null ? `${m.home_score} – ${m.away_score}` : m.match_date}
                  </span>
                  <span className="gm-team away">{m.away_team} {m.away_flag}</span>
                  <span className={`badge ${m.status === 'live' ? 'badge-red' : m.status === 'finished' ? 'badge-gray' : 'badge-green'}`} style={{ fontSize: 10 }}>
                    {m.status === 'live' ? '🔴 Live' : m.status === 'finished' ? 'Fin' : 'À venir'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {groups.length === 0 && (
        <div className="empty-state"><div style={{ fontSize: 40 }}>📊</div><p>Aucun match disponible.</p></div>
      )}
    </div>
  )
}
