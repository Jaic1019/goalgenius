import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { calcPoints } from '../lib/scoring'
import './Leaderboard.css'

export default function Leaderboard() {
  const { user } = useAuth()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLeaderboard() }, [])

  async function loadLeaderboard() {
    setLoading(true)
    // Fetch all predictions with user profile and match result
    const { data: preds } = await supabase
      .from('predictions')
      .select(`
        user_id,
        home_score,
        away_score,
        match:matches(home_score, away_score, status),
        profile:profiles(full_name)
      `)

    if (!preds) { setLoading(false); return }

    // Aggregate points per user
    const userMap = {}
    for (const p of preds) {
      const uid = p.user_id
      const name = p.profile?.full_name ?? 'Unknown'
      if (!userMap[uid]) userMap[uid] = { uid, name, points: 0, predictions: 0, exact: 0 }
      userMap[uid].predictions++
      if (p.match?.status === 'finished' && p.match.home_score !== null) {
        const pts = calcPoints(
          { home_score: p.home_score, away_score: p.away_score },
          { home_score: p.match.home_score, away_score: p.match.away_score }
        )
        userMap[uid].points += pts ?? 0
        if (pts === 10) userMap[uid].exact++
      }
    }

    const sorted = Object.values(userMap).sort((a, b) => b.points - a.points || b.exact - a.exact)
    setBoard(sorted)
    setLoading(false)
  }

  const MEDAL = ['🥇', '🥈', '🥉']

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="lb-page fade-up">
      <div className="page-header">
        <h1 className="display page-title">Leaderboard</h1>
        <p className="page-sub">Rankings update automatically as results come in.</p>
      </div>

      {board.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>🏆</div>
          <p>No predictions yet — be the first to predict!</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {board.length >= 3 && (
            <div className="podium">
              {[board[1], board[0], board[2]].map((entry, i) => {
                const rank = i === 1 ? 0 : i === 0 ? 1 : 2
                return (
                  <div key={entry.uid} className={`podium-slot rank-${rank}`}>
                    <div className="podium-medal">{MEDAL[rank]}</div>
                    <div className="podium-avatar">{entry.name[0]}</div>
                    <div className="podium-name">{entry.name.split(' ')[0]}</div>
                    <div className="podium-pts display">{entry.points}</div>
                    <div className="podium-pts-label">pts</div>
                    <div className={`podium-bar rank-${rank}`} />
                  </div>
                )
              })}
            </div>
          )}

          {/* Full table */}
          <div className="lb-table">
            <div className="lb-thead">
              <span>#</span>
              <span>Player</span>
              <span className="align-right">Predictions</span>
              <span className="align-right">Exact</span>
              <span className="align-right">Points</span>
            </div>
            {board.map((entry, i) => (
              <div key={entry.uid} className={`lb-row ${entry.uid === user.id ? 'lb-row-me' : ''}`}>
                <span className="lb-rank">
                  {i < 3 ? MEDAL[i] : <span className="rank-num">{i + 1}</span>}
                </span>
                <span className="lb-name">
                  {entry.name}
                  {entry.uid === user.id && <span className="you-badge">You</span>}
                </span>
                <span className="lb-cell align-right">{entry.predictions}</span>
                <span className="lb-cell align-right">{entry.exact > 0 ? `${entry.exact} 🎯` : '—'}</span>
                <span className="lb-pts">{entry.points}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
