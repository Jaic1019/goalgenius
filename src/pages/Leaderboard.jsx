import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useMatches } from '../hooks/useMatches'
import { calcPoints, SCORING_RULES } from '../lib/scoring'
import './Leaderboard.css'

export default function Leaderboard() {
  const { user, isAdmin } = useAuth()
  const { matches } = useMatches()
  const [board, setBoard]         = useState([])
  const [allPreds, setAllPreds]   = useState([]) // all predictions for expand
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState(null)
  const [finishedCount, setFinishedCount] = useState(0)

  useEffect(() => { if (matches.length > 0) buildBoard() }, [matches])

  async function buildBoard() {
    // Fetch ALL predictions with profile info
    const { data } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score, winner_pick, profile:profiles(full_name, role)')

    if (!data) { setLoading(false); return }
    setAllPreds(data)

    const finishedMatches = matches.filter(m => m.status === 'finished' && m.home_score != null)
    setFinishedCount(finishedMatches.length)

    const matchMap = {}
    for (const m of matches) matchMap[m.id] = m

    // Build scores for ALL users — including 0 points
    const userMap = {}

    // First pass: register all users from predictions
    for (const p of data) {
      const uid  = p.user_id
      const name = p.profile?.full_name ?? 'Inconnu'
      const role = p.profile?.role ?? 'employee'
      if (!userMap[uid]) userMap[uid] = { uid, name, role, points:0, preds:0, perfect:0, correct:0, partial:0 }
      userMap[uid].preds++

      // Only calculate points for finished matches
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

    // Sort by points descending, then by perfect scores
    const sorted = Object.values(userMap)
      .filter(e => e.role !== 'admin' || isAdmin)
      .sort((a,b) => b.points - a.points || b.perfect - a.perfect || b.correct - a.correct)

    setBoard(sorted)
    setLoading(false)
  }

  function toggleExpand(uid) {
    setExpanded(expanded === uid ? null : uid)
  }

  // Get predictions for a specific user
  function getUserHistory(uid) {
    const userPreds = allPreds.filter(p => p.user_id === uid)
    const matchMap = {}
    for (const m of matches) matchMap[m.id] = m

    return userPreds.map(p => {
      const match = matchMap[p.match_id]
      if (!match) return null
      const pts = match.status === 'finished' && match.home_score != null
        ? calcPoints(
            { home_score: p.home_score, away_score: p.away_score, winner_pick: p.winner_pick },
            { home_score: match.home_score, away_score: match.away_score }
          )
        : null
      return { match, pred: p, pts }
    })
    .filter(Boolean)
    .sort((a,b) => a.match.match_date?.localeCompare(b.match.match_date))
  }

  // Can a user see expanded predictions?
  function canExpand(uid) {
    return isAdmin || uid === user?.id
  }

  const myEntry = board.find(e => e.uid === user?.id)
  const myRank  = board.findIndex(e => e.uid === user?.id) + 1
  const MEDAL   = ['🥇','🥈','🥉']
  const RANK_CLASS = ['rank0','rank1','rank2']

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="lb-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Classement <span>Général</span></h1>
        <p className="page-sub">
          {board.length} participant{board.length>1?'s':''} · 
          {finishedCount === 0
            ? ' Points à 0 — en attente du premier match terminé'
            : ` ${finishedCount} match${finishedCount>1?'s':''} terminé${finishedCount>1?'s':''} · Points mis à jour automatiquement`
          }
        </p>
      </div>

      {/* My position banner */}
      {myEntry && (
        <div className="my-pos-card">
          <div className="mp-rank display">#{myRank}</div>
          <div className="mp-info">
            <div className="mp-name">{myEntry.name}</div>
            <div className="mp-stats">
              {myEntry.preds} pronostic{myEntry.preds>1?'s':''} soumis
              {finishedCount > 0 && ` · ${myEntry.perfect} parfait${myEntry.perfect>1?'s':''} · ${myEntry.correct} bon${myEntry.correct>1?'s':''}`}
            </div>
          </div>
          <div className="mp-pts">
            <span className="mp-pts-n display">{myEntry.points}</span>
            <span className="mp-pts-l">pts</span>
          </div>
        </div>
      )}

      {board.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <p>Aucun pronostic soumis pour l'instant.<br/>Soyez le premier à jouer !</p>
        </div>
      ) : (
        <>
          {/* TOP 3 PODIUM — always shown, 0 pts if not started */}
          {board.length >= 3 && (
            <div className="podium">
              {[{e:board[1],r:1},{e:board[0],r:0},{e:board[2],r:2}].map(({e,r}) => (
                <div key={e.uid} className={`pod ${RANK_CLASS[r]}`}>
                  <div className="pod-medal">{MEDAL[r]}</div>
                  <div className={`pod-av ${RANK_CLASS[r]}`}>{e.name[0]}</div>
                  <div className="pod-name">{e.name.split(' ')[0]}</div>
                  <div className="pod-pts display">{e.points}</div>
                  <div className="pod-sub">pts</div>
                  <div className={`pod-bar ${RANK_CLASS[r]}`}/>
                </div>
              ))}
            </div>
          )}

          {/* FULL TABLE */}
          <div className="lb-table">
            <div className="lb-head">
              <span>#</span>
              <span>Collaborateur</span>
              <span className="ar">Pronostics</span>
              <span className="ar pts-h">Points</span>
              <span></span>
            </div>

            {board.map((e,i) => {
              const isTop3 = i < 3
              const isMe = e.uid === user?.id
              const isExpanded = expanded === e.uid
              const canSee = canExpand(e.uid)
              const history = isExpanded ? getUserHistory(e.uid) : []

              return (
                <div key={e.uid}>
                  {/* Main row */}
                  <div
                    className={`lb-row ${isMe?'lb-me':''} ${isTop3?`lb-top${i}`:''}`}
                    onClick={() => canSee && toggleExpand(e.uid)}
                    style={{ cursor: canSee ? 'pointer' : 'default' }}
                  >
                    <span className="lb-rank">
                      {i < 3
                        ? <span className="lb-medal">{MEDAL[i]}</span>
                        : <span className="lb-rn">{i+1}</span>
                      }
                    </span>

                    <span className="lb-name">
                      <span className={`lb-av ${isTop3?RANK_CLASS[i]:''}`}>{e.name[0]}</span>
                      <span className="lb-fullname">{e.name}</span>
                      {isMe && <span className="you-tag">Vous</span>}
                    </span>

                    <span className="lb-cell ar">{e.preds}</span>

                    <span className={`lb-pts ${isTop3?`top-pts${i}`:''}`}>
                      {e.points}
                    </span>

                    <span className="lb-expand">
                      {canSee ? (isExpanded ? '▲' : '▼') : ''}
                    </span>
                  </div>

                  {/* Expanded predictions */}
                  {isExpanded && canSee && (
                    <div className="history-panel">
                      <div className="hist-title">
                        {isMe ? 'Vos pronostics' : `Pronostics de ${e.name.split(' ')[0]}`}
                        {!isAdmin && !isMe && ' — vous ne pouvez voir que les vôtres'}
                      </div>

                      {history.length === 0 && (
                        <p className="hist-empty">Aucun pronostic soumis.</p>
                      )}

                      {history.map((h,hi) => {
                        const isPending = h.match.status !== 'finished'
                        const winnerLabel = h.pred.winner_pick === 'home' ? h.match.home_team
                          : h.pred.winner_pick === 'away' ? h.match.away_team
                          : h.pred.winner_pick === 'draw' ? 'Match nul' : '—'

                        return (
                          <div key={hi} className={`hist-row 
                            ${isPending ? 'hist-pending' : ''}
                            ${h.pts===10?'hist-perfect':h.pts===5?'hist-good':h.pts===3?'hist-partial':h.pts===0&&!isPending?'hist-miss':''}`}>
                            <div className="hist-left">
                              <span className="hist-match">{h.match.home_team} vs {h.match.away_team}</span>
                              <span className="hist-group">{h.match.group_stage} · {h.match.match_date}</span>
                            </div>
                            <div className="hist-center">
                              <span className="hist-pred-score">{h.pred.home_score}–{h.pred.away_score}</span>
                              <span className="hist-pred-winner">🏆 {winnerLabel}</span>
                            </div>
                            <div className="hist-right">
                              {isPending ? (
                                <span className="badge badge-gray">⏳ À venir</span>
                              ) : (
                                <>
                                  <span className="hist-result">Résultat : {h.match.home_score}–{h.match.away_score}</span>
                                  <span className={`badge ${h.pts===10?'badge-gold':h.pts===5?'badge-green':h.pts===3?'badge-blue':'badge-gray'}`}>
                                    {h.pts===10?'🏆 ':h.pts===5?'⭐ ':h.pts===3?'👍 ':''}{h.pts} pts
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
