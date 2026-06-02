import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { calcPoints } from '../lib/scoring'
import './MatchCard.css'

function Flag({ url, name, size = 36 }) {
  const [err, setErr] = useState(false)
  if (!url || err) return (
    <div className="flag-fb" style={{ width: size, height: Math.round(size * 0.67) }}>
      {name?.[0] ?? '?'}
    </div>
  )
  return <img src={url} alt={name} className="flag-img"
    style={{ width: size, height: Math.round(size * 0.67) }} onError={() => setErr(true)} />
}

const STATUS = { upcoming: 'Upcoming', live: 'Live', finished: 'Final' }

export default function MatchCard({ match, pred, open, draft = {}, onDraft, onSubmit, submitting }) {
  const pts = pred && match.home_score != null
    ? calcPoints({ home_score: pred.home_score, away_score: pred.away_score }, match)
    : null

  let dateStr = ''
  try { dateStr = format(parseISO(match.match_date), 'EEE d MMM') } catch {}

  const ptsCls = pts === 10 ? 'badge-gold' : pts >= 5 ? 'badge-green' : pts > 0 ? 'badge-blue' : 'badge-gray'

  return (
    <div className={`mc mc-${match.status}`}>
      {match.status === 'live' && <div className="mc-live-bar" />}

      <div className="mc-head">
        <span className="mc-group">{match.group_stage}</span>
        <span className={`badge ${match.status === 'live' ? 'badge-red' : match.status === 'finished' ? 'badge-gray' : 'badge-purple'}`}>
          {match.status === 'live' && <span className="live-dot" />}
          {STATUS[match.status]}
        </span>
        <span className="mc-time">{dateStr} · {match.match_time?.slice(0,5)} CET</span>
      </div>

      <div className="mc-body">
        <div className="mc-team home">
          <Flag url={match.home_flag} name={match.home_team} />
          <span className="mc-name">{match.home_team}</span>
        </div>

        <div className="mc-center">
          {match.home_score != null
            ? <div className="mc-score display">{match.home_score}<span className="mc-dash">–</span>{match.away_score}</div>
            : <div className="mc-vs">VS</div>
          }
          {match.city && <div className="mc-city">{match.city}</div>}
        </div>

        <div className="mc-team away">
          <span className="mc-name">{match.away_team}</span>
          <Flag url={match.away_flag} name={match.away_team} />
        </div>
      </div>

      <div className="mc-foot">
        {open ? (
          <div className="mc-input-row">
            <span className="mc-input-label">Your prediction:</span>
            <input type="number" min="0" max="20" className="mc-in" placeholder="0"
              value={draft.home ?? ''} onChange={e => onDraft('home', e.target.value)} />
            <span className="mc-in-dash">–</span>
            <input type="number" min="0" max="20" className="mc-in" placeholder="0"
              value={draft.away ?? ''} onChange={e => onDraft('away', e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={onSubmit} disabled={submitting}>
              {submitting ? '…' : 'Save'}
            </button>
          </div>
        ) : pred ? (
          <div className="mc-pred-show">
            <span className="mc-pred-txt">Your pick: <strong>{pred.home_score}–{pred.away_score}</strong></span>
            {pts != null
              ? <span className={`badge ${ptsCls}`}>{pts === 10 ? '🏆 ' : pts >= 7 ? '⭐ ' : ''}{pts} pts</span>
              : <span className="mc-waiting">Awaiting result</span>
            }
          </div>
        ) : (
          <span className="mc-no-pred">
            {match.status === 'upcoming' ? 'Predictions open before kick-off' : 'No prediction submitted'}
          </span>
        )}
      </div>
    </div>
  )
}
