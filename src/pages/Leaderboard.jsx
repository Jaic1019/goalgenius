import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useMatches } from '../hooks/useMatches'
import { calcPoints, SCORING_RULES } from '../lib/scoring'
import './Leaderboard.css'

export default function Leaderboard() {
  const { user, isAdmin } = useAuth()
  const { matches } = useMatches()
  const [board, setBoard]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null) // uid of expanded row
  const [histories, setHistories] = useState({}) // uid -> prediction history

  useEffect(() => { if (matches.length > 0) buildBoard() }, [matches])

  async function buildBoard() {
    const { data } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score, winner_pick, profile:profiles(full_name, role)')

    if (!data) { setLoading(false); return }

    const matchMap = {}
    for (const m of matches) matchMap[m.id] = m

    const userMap = {}
    for (const p of data) {
      const uid  = p.user_id
      const name = p.profile?.full_name ?? 'Inconnu'
      const role = p.profile?.role ?? 'employee'
      if (!userMap[uid]) userMap[uid] = { uid, name, role, points:0, preds:0, perfect:0, correct:0, partial:0 }
      userMap[uid].preds++

      const match = matchMap[p.match_id]
      if (match?.status === 'finished' && match.home_score != null) {
        const pts = calcPoints(
          { home_score: p.home_score, away_score: p.away_score, winner_pick: p.winner_pick },
          { home_score: match.home_score, away_score: match.away_score }
        )
        userMap[uid].points += pts ?? 0
        if (pts === 10) userMap[uid].perfect++
        else if (pts === 5) userMap[uid].correct++
        else if (pts === 3) userMap[uid].partial++
      }
    }

    const sorted = Object.values(userMap)
      .filter(e => isAdmin ? true : e.role !== 'admin')
      .sort((a,b) => b.points - a.points || b.perfect - a.perfect || b.correct - a.correct)

    setBoard(sorted)
    setLoading(false)
  }

  async function loadHistory(uid) {
    if (histories[uid]) { setExpanded(expanded === uid ? null : uid); return }

    const { data } = await supabase
      .from('predictions')
      .select('match_id, home_score, away_score, winner_pick')
      .eq('user_id', uid)

    if (!data) return

    const matchMap = {}
    for (const m of matches) matchMap[m.id] = m

    const history = data.map(p => {
      const match = matchMap[p.match_id]
      if (!match) return null
      const pts = match.status === 'finished' && match.home_score != null
        ? calcPoints(
            { home_score: p.home_score, away_score: p.away_score, winner_pick: p.winner_pick },
            { home_score: match.home_score, away_score: match.away_score }
          )
        : null
      return { match, pred: p, pts }
    }).filter(Boolean).sort((a,b) => a.match.match_date?.localeCompare(b.match.match_date))

    setHistories(h => ({ ...h, [uid]: history }))
    setExpanded(expanded === uid ? null : uid)
  }

  const M = ['🥇','🥈','🥉']
  const myEntry = board.find(e => e.uid === user?.id)
  const myRank  = board.findIndex(e => e.uid === user?.id) + 1

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="lb-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Classement <span>Général</span></h1>
        <p className="page-sub">{board.length} participants · Mis à jour automatiquement</p>
      </div>

      {/* My position banner */}
      {myEntry && (
        <div className="my-pos-card">
          <div className="mp-rank display">#{myRank}</div>
          <div className="mp-info">
            <div className="mp-name">{myEntry.name}</div>
            <div className="mp-stats">
              {myEntry.perfect} parfaits · {myEntry.correct} bons · {myEntry.partial} partiels · {myEntry.preds} pronostics
            </div>
          </div>
          <div className="mp-pts">
            <span className="mp-pts-n display">{myEntry.points}</span>
            <span className="mp-pts-l">pts</span>
          </div>
        </div>
      )}

      {board.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏆</div><p>Aucun pronostic pour l'instant !</p></div>
      ) : (
        <>
          {/* Podium */}
          {board.length >= 3 && (
            <div className="podium">
              {[{e:board[1],r:1},{e:board[0],r:0},{e:board[2],r:2}].map(({e,r}) => (
                <div key={e.uid} className={`pod rank${r}`}>
                  <div className="pod-medal">{M[r]}</div>
                  <div className={`pod-av rank${r}`}>{e.name[0]}</div>
                  <div className="pod-name">{e.name.split(' ')[0]}</div>
                  <div className="pod-pts display">{e.points}</div>
                  <div className="pod-sub">pts</div>
                  <div className={`pod-bar rank${r}`}/>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="lb-table">
            <div className="lb-head">
              <span>#</span>
              <span>Collaborateur</span>
              <span className="ar">Pronostics</span>
              <span className="ar">🏆 Parfaits</span>
              <span className="ar">⭐ Bons</span>
              <span className="ar pts-h">Points</span>
              <span></span>
            </div>
            {board.map((e,i) => (
              <>
                <div key={e.uid} className={`lb-row ${e.uid===user?.id?'lb-me':''}`}
                  onClick={() => loadHistory(e.uid)} style={{cursor:'pointer'}}>
                  <span className="lb-rank">{i<3?M[i]:<span className="lb-rn">{i+1}</span>}</span>
                  <span className="lb-name">
                    <span className="lb-av">{e.name[0]}</span>
                    <span>{e.name}</span>
                    {e.uid===user?.id && <span className="you-tag">Vous</span>}
                    {isAdmin && e.role==='admin' && <span className="admin-tag-sm">Admin</span>}
                  </span>
                  <span className="lb-cell ar">{e.preds}</span>
                  <span className="lb-cell ar">{e.perfect||'—'}</span>
                  <span className="lb-cell ar">{e.correct||'—'}</span>
                  <span className="lb-pts">{e.points}</span>
                  <span className="lb-expand">{expanded===e.uid?'▲':'▼'}</span>
                </div>

                {/* History row */}
                {expanded === e.uid && histories[e.uid] && (
                  <div key={`hist-${e.uid}`} className="history-panel">
                    <div className="hist-title">Historique des pronostics de {e.name.split(' ')[0]}</div>
                    {histories[e.uid].length === 0 && <p className="hist-empty">Aucun pronostic soumis.</p>}
                    {histories[e.uid].map((h,hi) => (
                      <div key={hi} className={`hist-row ${h.pts === 10 ? 'hist-perfect' : h.pts >= 5 ? 'hist-good' : h.pts === 3 ? 'hist-partial' : ''}`}>
                        <span className="hist-match">{h.match.home_team} vs {h.match.away_team}</span>
                        <span className="hist-group">{h.match.group_stage}</span>
                        <span className="hist-result">
                          {h.match.home_score != null ? `${h.match.home_score}–${h.match.away_score}` : '—'}
                        </span>
                        <span className="hist-pred">
                          Pronostic : {h.pred.home_score}–{h.pred.away_score}
                          {h.pred.winner_pick && ` · ${h.pred.winner_pick === 'home' ? h.match.home_team : h.pred.winner_pick === 'away' ? h.match.away_team : 'Nul'}`}
                        </span>
                        <span className={`badge ${h.pts===10?'badge-gold':h.pts===5?'badge-green':h.pts===3?'badge-blue':'badge-gray'}`}>
                          {h.pts != null ? `${h.pts} pts` : 'En attente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ))}
          </div>

          {/* Scoring rules */}
          <div className="card scoring-ref">
            <div className="sr-title">Système de points</div>
            <div className="sr-grid">
              {SCORING_RULES.map(r => (
                <div key={r.pts} className="sr-item">
                  <span className="sr-pts display">{r.pts}</span>
                  <div>
                    <div className="sr-label">{r.emoji} {r.label}</div>
                    <div className="sr-desc">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
