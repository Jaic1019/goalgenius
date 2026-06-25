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
  const [allPreds, setAllPreds] = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [finishedCount, setFinishedCount] = useState(0)

  useEffect(() => { if (matches.length > 0) buildBoard() }, [matches])

  async function fetchAllPredictions() {
    const PAGE = 1000
    let all = [], from = 0
    while (true) {
      const { data, error } = await supabase
        .from('predictions')
        .select('user_id, match_id, home_score, away_score, winner_pick')
        .range(from, from + PAGE - 1)
      if (error || !data || data.length === 0) break
      all = all.concat(data)
      if (data.length < PAGE) break
      from += PAGE
    }
    return all
  }

  async function buildBoard() {
    const [{ data: profiles }, { data: freshMatches }, preds] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role').eq('role', 'employee'),
      supabase.from('matches').select('id, home_score, away_score, status, winner, home_penalty, away_penalty'),
      fetchAllPredictions(),
    ])

    if (!profiles) { setLoading(false); return }
    setAllPreds(preds || [])

    const matchMap = {}
    for (const m of (freshMatches || [])) matchMap[m.id] = m

    const finishedCount = (freshMatches || []).filter(m => m.status === 'finished' && m.home_score != null).length
    setFinishedCount(finishedCount)

    const predsByUser = {}
    for (const p of (preds || [])) {
      if (!predsByUser[p.user_id]) predsByUser[p.user_id] = []
      predsByUser[p.user_id].push(p)
    }

    const board = profiles.map(profile => {
      const uid = profile.id
      const userPreds = predsByUser[uid] || []
      let points = 0, predCount = userPreds.length, perfect = 0, correct = 0, partial = 0

      for (const p of userPreds) {
        const match = matchMap[p.match_id]
        if (match?.status === 'finished' && match.home_score != null) {
          const pts = calcPoints(
            { home_score: p.home_score, away_score: p.away_score, winner_pick: p.winner_pick },
            { home_score: match.home_score, away_score: match.away_score, winner: match.winner, home_penalty: match.home_penalty, away_penalty: match.away_penalty }
          )
          points += pts ?? 0
          if (pts === 10) perfect++
          else if (pts === 5) correct++
          else if (pts === 3) partial++
        }
      }

      return { uid, name: profile.full_name, points, predCount, perfect, correct, partial }
    })

    board.sort((a,b) => b.points - a.points || b.perfect - a.perfect || b.correct - a.correct || a.name?.localeCompare(b.name))
    setBoard(board)
    setLoading(false)
  }

  function toggleExpand(uid) {
    // User can only expand their own row
    // Admin can expand any row
    if (!isAdmin && uid !== user?.id) return
    setExpanded(expanded === uid ? null : uid)
  }

  // Build history for a user — all matches sorted by date, show prediction if exists
  function getUserHistory(uid) {
    const predsByMatch = {}
    for (const p of allPreds.filter(p => p.user_id === uid)) {
      predsByMatch[p.match_id] = p
    }

    // All 104 matches sorted by date — including knockout TBD
    return matches
      .sort((a,b) => a.match_date?.localeCompare(b.match_date) || a.match_time?.localeCompare(b.match_time))
      .map(match => {
        const pred = predsByMatch[match.id] || null
        const pts = pred && match.status === 'finished' && match.home_score != null
          ? calcPoints(
              { home_score: pred.home_score, away_score: pred.away_score, winner_pick: pred.winner_pick },
              { home_score: match.home_score, away_score: match.away_score, winner: match.winner, home_penalty: match.home_penalty, away_penalty: match.away_penalty }
            )
          : null
        // Display name: use label when team is null (knockout TBD)
        const homeName = match.home_team || match.home_team_label || 'À déterminer'
        const awayName = match.away_team || match.away_team_label || 'À déterminer'
        return { match, pred, pts, homeName, awayName }
      })
  }

  const MEDAL = ['🥇','🥈','🥉','🏅','🏅']
  const RANK_CLASS = ['rank0','rank1','rank2','rank3','rank4']
  const myEntry = board.find(e => e.uid === user?.id)
  const myRank  = board.findIndex(e => e.uid === user?.id) + 1

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="lb-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Classement <span>Général</span></h1>
        <p className="page-sub">
          {board.length} participant{board.length>1?'s':''} ·
          {finishedCount === 0
            ? ' Points à 0 — en attente du premier match terminé'
            : ` ${finishedCount} match${finishedCount>1?'s':''} terminé${finishedCount>1?'s':''} · Mis à jour automatiquement`
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
              {myEntry.predCount} pronostic{myEntry.predCount>1?'s':''} soumis
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
          <div className="empty-icon">👥</div>
          <p>Aucun collaborateur inscrit pour l'instant.</p>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {board.length >= 3 && (
            <div className="podium">
              {([{e:board[1],r:1},{e:board[0],r:0},{e:board[2],r:2},...(board[3]?[{e:board[3],r:3}]:[]),...(board[4]?[{e:board[4],r:4}]:[])]).map(({e,r}) => (
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

          {/* Full table */}
          <div className="lb-table">
            <div className="lb-head">
              <span>#</span>
              <span>Collaborateur</span>
              <span className="ar">Pronostics</span>
              <span className="ar pts-h">Points</span>
              <span></span>
            </div>

            {board.map((e,i) => {
              const isTop5     = i < 5
              const isMe       = e.uid === user?.id
              const isExpanded = expanded === e.uid
              // Admin can expand all, user can only expand own
              const canExpand  = isAdmin || isMe
              const history    = isExpanded ? getUserHistory(e.uid) : []

              return (
                <div key={e.uid}>
                  <div
                    className={`lb-row ${isMe?'lb-me':''} ${isTop5?`lb-top${i}`:''}`}
                    onClick={() => toggleExpand(e.uid)}
                    style={{ cursor: canExpand ? 'pointer' : 'default' }}
                  >
                    <span className="lb-rank">
                      {i < 5
                        ? <span className="lb-medal">{MEDAL[i]}</span>
                        : <span className="lb-rn">{i+1}</span>
                      }
                    </span>
                    <span className="lb-name">
                      <span className={`lb-av ${isTop5?RANK_CLASS[i]:''}`}>{e.name[0]}</span>
                      <span className="lb-fullname">{e.name}</span>
                      {isMe && <span className="you-tag">Vous</span>}
                    </span>
                    <span className="lb-cell ar">{e.predCount}</span>
                    <span className={`lb-pts ${isTop5?`top-pts${i}`:''}`}>{e.points}</span>
                    <span className="lb-expand">
                      {canExpand ? (isExpanded ? '▲' : '▼') : ''}
                    </span>
                  </div>

                  {/* Expanded history — all matches sorted by date */}
                  {isExpanded && canExpand && (
                    <div className="history-panel">
                      <div className="hist-title">
                        {isMe
                          ? `Vos pronostics — ${history.filter(h=>h.pred).length} soumis sur ${history.length} matchs`
                          : `Pronostics de ${e.name.split(' ')[0]} — ${history.filter(h=>h.pred).length} soumis sur ${history.length} matchs`
                        }
                      </div>

                      {history.length === 0 && <p className="hist-empty">Aucun match disponible.</p>}

                      {history.map((h,hi) => {
                        const isPending  = h.match.status !== 'finished'
                        const hasPred    = !!h.pred
                        const winnerLabel = !h.pred ? null
                          : h.pred.winner_pick === 'home' ? h.homeName
                          : h.pred.winner_pick === 'away' ? h.awayName
                          : h.pred.winner_pick === 'draw' ? 'Match nul' : '—'

                        return (
                          <div key={hi} className={`hist-row
                            ${!hasPred ? 'hist-no-pred' : ''}
                            ${isPending && hasPred ? 'hist-pending' : ''}
                            ${h.pts===10 ? 'hist-perfect' : h.pts===5 ? 'hist-good' : h.pts===3 ? 'hist-partial' : !isPending && hasPred && h.pts===0 ? 'hist-miss' : ''}`}>

                            {/* Match info */}
                            <div className="hist-left">
                              <span className="hist-match">
                                {h.match.api_id && <span className="hist-match-id">M{h.match.api_id} · </span>}
                                {h.homeName} vs {h.awayName}
                              </span>
                              <span className="hist-group">
                                {h.match.group_stage} · {h.match.match_date} · {h.match.match_time?.slice(0,5)} CEST
                              </span>
                            </div>

                            {/* User prediction */}
                            <div className="hist-center">
                              {hasPred ? (
                                <>
                                  <span className="hist-pred-score">{h.pred.home_score}–{h.pred.away_score}</span>
                                  <span className="hist-pred-winner">🏆 {winnerLabel}</span>
                                </>
                              ) : (
                                <span className="hist-no-pred-label">Pas de pronostic</span>
                              )}
                            </div>

                            {/* Result + points */}
                            <div className="hist-right">
                              {!hasPred ? (
                                <span className="badge badge-gray">—</span>
                              ) : isPending ? (
                                <span className="badge badge-gray">⏳ À venir</span>
                              ) : (
                                <>
                                  <span className="hist-result">
                                    Résultat : {h.match.home_score}–{h.match.away_score}
                                  </span>
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
