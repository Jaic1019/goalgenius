import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useMatches } from '../hooks/useMatches'
import { calcPoints, SCORING_RULES } from '../lib/scoring'
import './Leaderboard.css'

export default function Leaderboard() {
  const { user, isAdmin } = useAuth()
  const { matches } = useMatches()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('all') // all | group | stage

  useEffect(() => {
    if (matches.length > 0) buildBoard()
  }, [matches])

  async function buildBoard() {
    const { data } = await supabase
      .from('predictions')
      .select('user_id, match_id, home_score, away_score, profile:profiles(full_name, role)')

    if (!data) { setLoading(false); return }

    // Build match result map from API/DB matches
    const matchMap = {}
    for (const m of matches) matchMap[m.id] = m

    const userMap = {}
    for (const p of data) {
      const uid = p.user_id
      const name = p.profile?.full_name ?? 'Unknown'
      const role = p.profile?.role ?? 'employee'
      if (!userMap[uid]) userMap[uid] = { uid, name, role, points:0, preds:0, perfect:0, correct:0, close:0 }
      userMap[uid].preds++

      const match = matchMap[p.match_id]
      if (match && match.status === 'finished' && match.home_score != null) {
        const pts = calcPoints(
          { home_score: p.home_score, away_score: p.away_score },
          { home_score: match.home_score, away_score: match.away_score }
        )
        userMap[uid].points += pts ?? 0
        if (pts === 10) userMap[uid].perfect++
        if (pts >= 5)   userMap[uid].correct++
        if (pts === 3)  userMap[uid].close++
      }
    }

    // Admins can see everyone; employees only see employees by default
    const sorted = Object.values(userMap)
      .filter(e => isAdmin ? true : e.role !== 'admin')
      .sort((a,b) => b.points - a.points || b.perfect - a.perfect)

    setBoard(sorted)
    setLoading(false)
  }

  const M = ['🥇','🥈','🥉']
  const myRank = board.findIndex(e => e.uid === user?.id) + 1
  const myEntry = board.find(e => e.uid === user?.id)

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>

  return (
    <div className="lb-page page fade-up">
      <div className="page-header">
        <h1 className="page-title">Leader<span>board</span></h1>
        <p className="page-sub">
          {board.length} participants · Auto-updated after each result
          {myEntry && ` · You are ranked #${myRank} with ${myEntry.points} pts`}
        </p>
      </div>

      {/* My position banner */}
      {myEntry && (
        <div className="my-position-card">
          <div className="mp-rank display">#{myRank}</div>
          <div className="mp-info">
            <div className="mp-name">{myEntry.name}</div>
            <div className="mp-stats">
              {myEntry.perfect} perfect · {myEntry.correct} correct · {myEntry.close} close
            </div>
          </div>
          <div className="mp-pts display">{myEntry.points}<span className="mp-pts-l">pts</span></div>
        </div>
      )}

      {board.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏆</div><p>No predictions yet — be the first!</p></div>
      ) : (
        <>
          {/* Podium top 3 */}
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

          {/* Full table */}
          <div className="lb-table">
            <div className="lb-head">
              <span>#</span>
              <span>Collaborator</span>
              <span className="ar">Predictions</span>
              <span className="ar">Perfect 🎯</span>
              <span className="ar">Correct</span>
              <span className="ar pts-h">Points</span>
            </div>
            {board.map((e,i) => (
              <div key={e.uid} className={`lb-row ${e.uid===user?.id?'lb-me':''} ${i<3?'lb-top':''}`}>
                <span className="lb-rank">{i<3?M[i]:<span className="lb-rn">{i+1}</span>}</span>
                <span className="lb-name">
                  <span className="lb-av">{e.name[0]}</span>
                  {e.name}
                  {e.uid===user?.id && <span className="you-tag">You</span>}
                  {isAdmin && e.role==='admin' && <span className="admin-tag-sm">Admin</span>}
                </span>
                <span className="lb-cell ar">{e.preds}</span>
                <span className="lb-cell ar">{e.perfect||'—'}</span>
                <span className="lb-cell ar">{e.correct||'—'}</span>
                <span className="lb-pts">{e.points}</span>
              </div>
            ))}
          </div>

          {/* Scoring reference */}
          <div className="card scoring-ref">
            <div className="sr-title">Scoring system</div>
            <div className="sr-grid">
              {SCORING_RULES.filter(r=>r.pts>0).map(r => (
                <div key={r.pts} className="sr-item">
                  <span className="sr-pts display">{r.pts}</span>
                  <div><div className="sr-label">{r.label}</div><div className="sr-desc">{r.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
