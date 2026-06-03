import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { calcPoints, validatePrediction } from '../lib/scoring'
import { resolveFlag } from '../lib/flags'
import './MatchCard.css'

const STATUS_FR = { upcoming: 'À venir', live: 'En direct', finished: 'Terminé' }

// ── Flag component — handles ISO codes, emojis, URLs ──────────────
function Flag({ url, name, size = 40 }) {
  const [err, setErr] = useState(false)
  const resolved = resolveFlag(url)
  const fallback = (
    <div className="flag-fb" style={{ width: size, height: Math.round(size * 0.67) }}>
      {name?.[0] ?? '?'}
    </div>
  )
  if (!resolved) return fallback
  if (!resolved.startsWith('http'))
    return <span className="flag-emoji" style={{ fontSize: Math.round(size * 0.8) }}>{resolved}</span>
  if (err) return fallback
  return (
    <img src={resolved} alt={name} className="flag-img"
      style={{ width: size, height: Math.round(size * 0.67) }}
      onError={() => setErr(true)} />
  )
}

// ── Helpers ───────────────────────────────────────────────────────
function isKnockoutMatch(g) {
  if (!g) return false
  const s = g.toLowerCase()
  return s.includes('r32') || s.includes('r16') || s.includes('top 32') || s.includes('top 16') ||
    s.includes('quart') || s.includes('qf') || s.includes('semi') || s.includes('demi') ||
    s.includes('sf') || s.includes('final') || s.includes('finale') ||
    s.includes('3ème') || s.includes('3rd')
}

function getWinnerLabel(wp, homeName, awayName) {
  if (wp === 'home') return homeName
  if (wp === 'away') return awayName
  if (wp === 'draw') return 'Match nul'
  return '—'
}

// ── Main Component ────────────────────────────────────────────────
export default function MatchCard({
  match, pred, open,
  draft = {}, onDraft, onSubmit, submitting, justSaved
}) {
  const isTBD = !match.home_team || !match.away_team ||
    match.home_team.trim().toUpperCase() === 'TBD' ||
    match.away_team.trim().toUpperCase() === 'TBD'

  const isKnockout     = isKnockoutMatch(match.group_stage)
  const effectiveOpen  = open && !isTBD
  const isUpdate       = !!pred

  // Real-time consistency check (shown while typing)
  const hasScores = draft.home !== undefined && draft.home !== '' &&
                    draft.away !== undefined && draft.away !== ''
  const consistencyError = effectiveOpen && hasScores && draft.winner
    ? validatePrediction(draft.home, draft.away, draft.winner, isKnockout)
    : null

  // Implied winner from score inputs (for button suggestion)
  const impliedWinner = hasScores
    ? Number(draft.home) > Number(draft.away) ? 'home'
    : Number(draft.home) < Number(draft.away) ? 'away'
    : 'draw'
    : null

  // Points calculation
  const pts = pred && match.home_score != null
    ? calcPoints(
        { home_score: pred.home_score, away_score: pred.away_score, winner_pick: pred.winner_pick },
        { home_score: match.home_score, away_score: match.away_score, winner: match.winner }
      )
    : null

  let dateStr = ''
  try { dateStr = format(parseISO(match.match_date), 'EEE d MMM', { locale: fr }) } catch {}

  const ptsCls   = pts === 10 ? 'badge-gold' : pts === 5 ? 'badge-green' : pts === 3 ? 'badge-blue' : 'badge-gray'
  const ptsEmoji = pts === 10 ? '🏆 ' : pts === 5 ? '⭐ ' : pts === 3 ? '👍 ' : ''

  // Can save: no consistency error OR scores not entered yet
  const canSave = !submitting && !(consistencyError && hasScores && draft.winner)

  return (
    <div className={`mc mc-${match.status}${isTBD ? ' mc-tbd' : ''}`}>
      {match.status === 'live' && <div className="mc-live-bar" />}

      {/* ── Header ── */}
      <div className="mc-head">
        <span className="mc-group">{match.group_stage}</span>
        <div className="mc-badges">
          <span className={`badge ${match.status === 'live' ? 'badge-red' : match.status === 'finished' ? 'badge-gray' : 'badge-purple'}`}>
            {match.status === 'live' && <span className="live-dot" />}
            {STATUS_FR[match.status]}
          </span>
          {isKnockout && <span className="badge badge-gold ko-badge">Élimination</span>}
        </div>
        <span className="mc-time">{dateStr} · {match.match_time?.slice(0, 5)} CET</span>
      </div>

      {/* ── Teams + Score ── */}
      <div className="mc-teams">
        <div className="mc-team home">
          <Flag url={match.home_flag} name={match.home_team} />
          <span className="mc-team-name">{isTBD ? 'À déterminer' : match.home_team}</span>
        </div>

        <div className="mc-center">
          {match.home_score != null ? (
            <>
              <div className="mc-score-live display">
                <span>{match.home_score}</span>
                <span className="mc-score-sep">–</span>
                <span>{match.away_score}</span>
              </div>
              {match.home_penalty != null && match.away_penalty != null && (
                <div className="mc-penalty">pen. {match.home_penalty}–{match.away_penalty}</div>
              )}
            </>
          ) : (
            <div className="mc-vs alt">VS</div>
          )}
          {(match.city || match.stadium) && (
            <div className="mc-city">🏟 {match.city || match.stadium}</div>
          )}
        </div>

        <div className="mc-team away">
          <span className="mc-team-name">{isTBD ? 'À déterminer' : match.away_team}</span>
          <Flag url={match.away_flag} name={match.away_team} />
        </div>
      </div>

      {/* ── Prediction Section ── */}
      <div className="mc-prediction">

        {/* TBD — teams not yet known */}
        {isTBD && (
          <div className="mc-tbd-msg">
            ⏳ Équipes à déterminer — les pronostics s'ouvriront automatiquement dès la confirmation des équipes
          </div>
        )}

        {/* OPEN — enter/edit prediction */}
        {effectiveOpen && (
          <div className="mc-pred-open">

            {/* Context message */}
            <div className={`pred-context ${isUpdate ? 'pred-context-update' : 'pred-context-new'}`}>
              {isUpdate
                ? <>✏️ <strong>Modifier votre pronostic</strong> — saisissez de nouveaux scores et validez. Votre ancien pronostic sera remplacé.</>
                : <>🎯 <strong>Saisissez votre pronostic</strong> avant le coup d'envoi. Vous pourrez le modifier jusqu'au début du match.</>
              }
            </div>

            {/* Score inputs */}
            <div className="pred-section-label">📊 Score prédit <span className="pred-label-hint">(90 minutes)</span></div>
            <div className="pred-score-row">
              <div className="pred-score-block">
                <div className="pred-score-label">{match.home_team}</div>
                <input
                  type="number" min="0" max="20"
                  className="score-in" placeholder="0"
                  value={draft.home ?? ''}
                  onChange={e => onDraft('home', e.target.value)}
                />
              </div>
              <div className="pred-score-dash">–</div>
              <div className="pred-score-block">
                <div className="pred-score-label">{match.away_team}</div>
                <input
                  type="number" min="0" max="20"
                  className="score-in" placeholder="0"
                  value={draft.away ?? ''}
                  onChange={e => onDraft('away', e.target.value)}
                />
              </div>
            </div>

            {/* Winner selection */}
            <div className="pred-winner-section">
              <div className="pred-section-label">
                🏆 Vainqueur prédit
                {isKnockout && <span className="pred-ko-hint"> — Pas de nul possible (match à élimination)</span>}
              </div>
              <div className="pred-winner-btns">
                <button
                  className={`winner-btn${draft.winner === 'home' ? ' selected home-sel' : impliedWinner === 'home' && !draft.winner ? ' implied' : ''}`}
                  onClick={() => onDraft('winner', draft.winner === 'home' ? null : 'home')}
                  type="button">
                  {match.home_team}
                </button>

                {/* Hide "Match nul" for knockout matches */}
                {!isKnockout && (
                  <button
                    className={`winner-btn winner-btn-draw${draft.winner === 'draw' ? ' selected draw-sel' : impliedWinner === 'draw' && !draft.winner ? ' implied' : ''}`}
                    onClick={() => onDraft('winner', draft.winner === 'draw' ? null : 'draw')}
                    type="button">
                    Match nul
                  </button>
                )}

                <button
                  className={`winner-btn${draft.winner === 'away' ? ' selected away-sel' : impliedWinner === 'away' && !draft.winner ? ' implied' : ''}`}
                  onClick={() => onDraft('winner', draft.winner === 'away' ? null : 'away')}
                  type="button">
                  {match.away_team}
                </button>
              </div>
            </div>

            {/* Consistency warning — real-time */}
            {consistencyError && (
              <div className="pred-warning">{consistencyError}</div>
            )}

            {/* Submit */}
            <button
              className="btn btn-primary pred-submit"
              onClick={onSubmit}
              disabled={!canSave}>
              {submitting
                ? '⏳ Enregistrement...'
                : isUpdate
                ? '✏️ Mettre à jour mon pronostic'
                : '✅ Valider mon pronostic'}
            </button>
          </div>
        )}

        {/* CONFIRMED — shown permanently after save */}
        {!effectiveOpen && !isTBD && pred && (
          <div className={`mc-pred-confirmed${justSaved ? ' mc-just-saved' : ''}`}>
            <div className="pred-conf-header">
              <span className="pred-conf-badge">✅ Pronostic enregistré</span>
              {match.status === 'upcoming' && (
                <span className="pred-conf-hint">Modifiable avant le coup d'envoi sur la page Matchs</span>
              )}
            </div>
            <div className="pred-conf-body">
              <div className="pred-conf-left">
                <span className="pred-conf-score">{pred.home_score} – {pred.away_score}</span>
                <span className="pred-conf-winner">
                  🏆 {getWinnerLabel(pred.winner_pick, match.home_team, match.away_team)}
                </span>
              </div>
              <div className="pred-conf-right">
                {pts != null ? (
                  <>
                    <span className={`badge ${ptsCls} pts-badge`}>{ptsEmoji}{pts} pts</span>
                    <span className="pred-pts-explain">
                      {pts === 10 && '🎯 Score parfait !'}
                      {pts === 5  && '👌 Bon vainqueur !'}
                      {pts === 3  && '👍 Un score juste !'}
                      {pts === 0  && '❌ Raté cette fois.'}
                    </span>
                  </>
                ) : (
                  <span className="pred-waiting">⏳ En attente du résultat</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* NO PREDICTION + not open */}
        {!effectiveOpen && !isTBD && !pred && (
          <div className="mc-pred-closed">
            {match.status === 'upcoming'
              ? '🔒 Pronostic ouvert avant le coup d\'envoi'
              : '— Aucun pronostic soumis pour ce match'}
          </div>
        )}
      </div>
    </div>
  )
}
