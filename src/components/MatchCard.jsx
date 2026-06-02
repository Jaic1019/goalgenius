import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { calcPoints } from '../lib/scoring'
import './MatchCard.css'

const STATUS_FR = { upcoming: 'À venir', live: 'En direct', finished: 'Terminé' }

function Flag({ url, name, size = 40 }) {
  const [err, setErr] = useState(false)
  if (!url || err) return (
    <div className="flag-fb" style={{ width: size, height: Math.round(size * 0.67) }}>
      {name?.[0] ?? '?'}
    </div>
  )
  return <img src={url} alt={name} className="flag-img"
    style={{ width: size, height: Math.round(size * 0.67) }} onError={() => setErr(true)} />
}

export default function MatchCard({ match, pred, open, draft = {}, onDraft, onSubmit, submitting, error }) {
  const pts = pred && match.home_score != null
    ? calcPoints(
        { home_score: pred.home_score, away_score: pred.away_score, winner_pick: pred.winner_pick },
        match
      )
    : null

  let dateStr = ''
  try { dateStr = format(parseISO(match.match_date), 'EEE d MMM', { locale: fr }) } catch {}

  const ptsCls = pts === 10 ? 'badge-gold' : pts === 5 ? 'badge-green' : pts === 3 ? 'badge-blue' : 'badge-gray'
  const ptsEmoji = pts === 10 ? '🏆 ' : pts === 5 ? '⭐ ' : pts === 3 ? '👍 ' : ''

  // Derive implied winner from score inputs
  const draftWinner = draft.home !== undefined && draft.away !== undefined && draft.home !== '' && draft.away !== ''
    ? Number(draft.home) > Number(draft.away) ? 'home'
    : Number(draft.home) < Number(draft.away) ? 'away' : 'draw'
    : null

  return (
    <div className={`mc mc-${match.status}`}>
      {match.status === 'live' && <div className="mc-live-bar" />}

      {/* Header */}
      <div className="mc-head">
        <span className="mc-group">{match.group_stage}</span>
        <span className={`badge ${match.status === 'live' ? 'badge-red' : match.status === 'finished' ? 'badge-gray' : 'badge-purple'}`}>
          {match.status === 'live' && <span className="live-dot" />}
          {STATUS_FR[match.status]}
        </span>
        <span className="mc-time">{dateStr} · {match.match_time?.slice(0, 5)} CET</span>
      </div>

      {/* Teams + Score */}
      <div className="mc-teams">
        <div className="mc-team home">
          <Flag url={match.home_flag} name={match.home_team} />
          <span className="mc-team-name">{match.home_team}</span>
        </div>

        <div className="mc-center">
          {match.home_score != null
            ? <div className="mc-score-live display">{match.home_score}<span className="mc-score-sep">–</span>{match.away_score}</div>
            : <div className="mc-vs alt">VS</div>
          }
          {match.city && <div className="mc-city">🏟 {match.city}</div>}
        </div>

        <div className="mc-team away">
          <span className="mc-team-name">{match.away_team}</span>
          <Flag url={match.away_flag} name={match.away_team} />
        </div>
      </div>

      {/* Prediction section */}
      <div className="mc-prediction">
        {open ? (
          <div className="mc-pred-open">
            <div className="pred-section-title">🎯 Votre pronostic</div>

            {/* Score inputs */}
            <div className="pred-score-row">
              <div className="pred-score-block">
                <div className="pred-score-label">{match.home_team}</div>
                <input
                  type="number" min="0" max="20"
                  className="score-in"
                  placeholder="0"
                  value={draft.home ?? ''}
                  onChange={e => onDraft('home', e.target.value)}
                />
              </div>
              <div className="pred-score-dash">–</div>
              <div className="pred-score-block">
                <div className="pred-score-label">{match.away_team}</div>
                <input
                  type="number" min="0" max="20"
                  className="score-in"
                  placeholder="0"
                  value={draft.away ?? ''}
                  onChange={e => onDraft('away', e.target.value)}
                />
              </div>
            </div>

            {/* Winner selection */}
            <div className="pred-winner-section">
              <div className="pred-winner-label">🏆 Choisissez le vainqueur</div>
              <div className="pred-winner-btns">
                <button
                  className={`winner-btn ${draft.winner === 'home' ? 'selected' : ''} ${draftWinner === 'home' && !draft.winner ? 'suggested' : ''}`}
                  onClick={() => onDraft('winner', draft.winner === 'home' ? null : 'home')}
                  type="button">
                  {match.home_team}
                </button>
                <button
                  className={`winner-btn winner-btn-draw ${draft.winner === 'draw' ? 'selected' : ''} ${draftWinner === 'draw' && !draft.winner ? 'suggested' : ''}`}
                  onClick={() => onDraft('winner', draft.winner === 'draw' ? null : 'draw')}
                  type="button">
                  Match nul
                </button>
                <button
                  className={`winner-btn ${draft.winner === 'away' ? 'selected' : ''} ${draftWinner === 'away' && !draft.winner ? 'suggested' : ''}`}
                  onClick={() => onDraft('winner', draft.winner === 'away' ? null : 'away')}
                  type="button">
                  {match.away_team}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && <div className="pred-error">⚠️ {error}</div>}

            {/* Submit */}
            <button className="btn btn-primary pred-submit" onClick={onSubmit} disabled={submitting}>
              {submitting ? 'Enregistrement...' : '✓ Valider mon pronostic'}
            </button>
          </div>
        ) : pred ? (
          <div className="mc-pred-done">
            <div className="pred-done-title">Votre pronostic :</div>
            <div className="pred-done-row">
              <span className="pred-done-score">
                {pred.home_score} – {pred.away_score}
              </span>
              <span className="pred-done-winner">
                Vainqueur prédit : <strong>
                  {pred.winner_pick === 'home' ? match.home_team
                  : pred.winner_pick === 'away' ? match.away_team
                  : pred.winner_pick === 'draw' ? 'Match nul'
                  : '—'}
                </strong>
              </span>
              {pts != null
                ? <span className={`badge ${ptsCls}`}>{ptsEmoji}{pts} pts</span>
                : <span className="pred-waiting">⏳ En attente du résultat</span>
              }
            </div>
          </div>
        ) : (
          <div className="mc-pred-closed">
            {match.status === 'upcoming'
              ? '🔒 Pronostic ouvert avant le coup d\'envoi'
              : '— Aucun pronostic soumis'}
          </div>
        )}
      </div>
    </div>
  )
}
