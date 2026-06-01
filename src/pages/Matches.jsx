import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { calcPoints } from '../lib/scoring'
import { format, parseISO, isBefore, isAfter, addMinutes } from 'date-fns'
import './Matches.css'

const STATUS_LABEL = { upcoming: 'Upcoming', live: '🔴 Live', finished: 'Final' }

export default function Matches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [draftInputs, setDraftInputs] = useState({})
  const [saving, setSaving] = useState({})
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: matchData }, { data: predData }] = await Promise.all([
      supabase.from('matches').select('*').order('match_date', { ascending: true }),
      supabase.from('predictions').select('*').eq('user_id', user.id),
    ])
    setMatches(matchData || [])
    const predMap = {}
    for (const p of (predData || [])) predMap[p.match_id] = p
    setPredictions(predMap)
    setLoading(false)
  }

  function isPredictionOpen(match) {
    // Allow predictions only if match is upcoming and current time is before match start
    if (match.status !== 'upcoming') return false
    const matchStart = parseISO(match.match_date + 'T' + match.match_time)
    return isBefore(new Date(), matchStart)
  }

  function setDraft(matchId, side, value) {
    setDraftInputs(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value === '' ? '' : Math.max(0, parseInt(value) || 0) }
    }))
  }

  async function submitPrediction(match) {
    const draft = draftInputs[match.id] || {}
    const home = draft.home
    const away = draft.away
    if (home === '' || home === undefined || away === '' || away === undefined) {
      showAlert('Enter both scores before submitting.', 'error')
      return
    }
    setSaving(prev => ({ ...prev, [match.id]: true }))
    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: match.id,
      home_score: Number(home),
      away_score: Number(away),
    }, { onConflict: 'user_id,match_id' })

    if (!error) {
      setPredictions(prev => ({ ...prev, [match.id]: { home_score: Number(home), away_score: Number(away) } }))
      setDraftInputs(prev => { const n = { ...prev }; delete n[match.id]; return n })
      showAlert('Prediction saved! 🎯', 'success')
    } else {
      showAlert('Failed to save. Try again.', 'error')
    }
    setSaving(prev => ({ ...prev, [match.id]: false }))
  }

  function showAlert(msg, type) {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 3000)
  }

  const now = new Date()
  const upcoming = matches.filter(m => m.status === 'upcoming')
  const live = matches.filter(m => m.status === 'live')
  const finished = matches.filter(m => m.status === 'finished')

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="matches-page fade-up">
      <div className="page-header">
        <h1 className="display page-title">Match Schedule</h1>
        <p className="page-sub">Submit your predictions before kick-off. Locked once the match starts.</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      {live.length > 0 && (
        <section className="match-section">
          <div className="section-label live-label">🔴 Live Now</div>
          {live.map(m => <MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false} />)}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="match-section">
          <div className="section-label">Upcoming</div>
          {upcoming.map(m => (
            <MatchCard
              key={m.id} match={m} pred={predictions[m.id]}
              open={isPredictionOpen(m)}
              draft={draftInputs[m.id] || {}}
              onDraft={(side, val) => setDraft(m.id, side, val)}
              onSubmit={() => submitPrediction(m)}
              submitting={saving[m.id]}
            />
          ))}
        </section>
      )}

      {finished.length > 0 && (
        <section className="match-section">
          <div className="section-label">Finished</div>
          {finished.map(m => (
            <MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false} />
          ))}
        </section>
      )}

      {matches.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>📅</div>
          <p>No matches scheduled yet. Check back soon!</p>
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, pred, open, draft = {}, onDraft, onSubmit, submitting }) {
  const pts = pred && match.home_score !== null
    ? calcPoints({ home_score: pred.home_score, away_score: pred.away_score }, match)
    : null

  return (
    <div className={`match-card ${match.status}`}>
      <div className="match-card-header">
        <span className="match-group">{match.group_stage}</span>
        <span className={`badge ${match.status === 'live' ? 'badge-red' : match.status === 'finished' ? 'badge-gray' : 'badge-green'}`}>
          {STATUS_LABEL[match.status]}
        </span>
        <span className="match-datetime">
          {format(parseISO(match.match_date), 'EEE d MMM')} · {match.match_time?.slice(0, 5)}
        </span>
      </div>

      <div className="match-teams">
        <div className="team home">
          <span className="team-flag">{match.home_flag}</span>
          <span className="team-name">{match.home_team}</span>
        </div>
        <div className="match-score-block">
          {match.home_score !== null
            ? <span className="score-final">{match.home_score} – {match.away_score}</span>
            : <span className="score-vs">VS</span>
          }
        </div>
        <div className="team away">
          <span className="team-name">{match.away_team}</span>
          <span className="team-flag">{match.away_flag}</span>
        </div>
      </div>

      <div className="match-prediction-row">
        {open ? (
          <div className="predict-inputs">
            <span className="predict-label">Your prediction:</span>
            <input
              type="number" min="0" max="20"
              className="score-input"
              placeholder="0"
              value={draft.home ?? ''}
              onChange={e => onDraft('home', e.target.value)}
            />
            <span className="predict-dash">–</span>
            <input
              type="number" min="0" max="20"
              className="score-input"
              placeholder="0"
              value={draft.away ?? ''}
              onChange={e => onDraft('away', e.target.value)}
            />
            <button className="btn btn-primary btn-sm" onClick={onSubmit} disabled={submitting}>
              {submitting ? '…' : 'Save'}
            </button>
          </div>
        ) : pred ? (
          <div className="pred-summary">
            <span className="pred-pick">
              Your pick: <strong>{pred.home_score} – {pred.away_score}</strong>
            </span>
            {pts !== null && (
              <span className={`badge ${pts >= 7 ? 'badge-gold' : pts >= 3 ? 'badge-green' : 'badge-gray'}`}>
                {pts === 10 ? '🏆 ' : pts >= 7 ? '⭐ ' : ''}{pts} pts
              </span>
            )}
            {pts === null && <span className="pred-waiting">Awaiting result</span>}
          </div>
        ) : (
          <span className="pred-closed">
            {match.status === 'upcoming' ? 'Predictions open before kick-off' : 'No prediction submitted'}
          </span>
        )}
      </div>
    </div>
  )
}
