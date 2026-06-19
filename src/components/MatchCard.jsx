import { useState } from 'react'
import { calcPoints, validatePrediction } from '../lib/scoring'
import { toParisTime, getStadiumName, isPredictionOpen, isKnockoutMatch } from '../lib/timeUtils'
import { resolveFlag } from '../lib/flags'
import './MatchCard.css'

const STATUS_FR = { upcoming: 'À venir', live: 'En direct', finished: 'Terminé' }

// ── Flag component ────────────────────────────────────────────────
function Flag({ url, name, size = 40 }) {
  const [err, setErr] = useState(false)
  if (!url) return <div className="flag-fb" style={{width:size,height:Math.round(size*0.67)}}>{name?.[0]??'?'}</div>
  const resolved = resolveFlag(url) || url
  if (!resolved.startsWith('http')) {
    return <span className="flag-emoji" style={{fontSize:Math.round(size*0.8)}}>{resolved}</span>
  }
  if (err) return <div className="flag-fb" style={{width:size,height:Math.round(size*0.67)}}>{name?.[0]??'?'}</div>
  return <img src={resolved} alt={name} className="flag-img"
    style={{width:size,height:Math.round(size*0.67)}} onError={()=>setErr(true)}/>
}

function getWinnerLabel(wp, homeName, awayName) {
  if (wp === 'home') return homeName
  if (wp === 'away') return awayName
  if (wp === 'draw') return 'Match nul'
  return '—'
}

// ── Main Component ────────────────────────────────────────────────
export default function MatchCard({
  match, pred, open, stadiums = {},
  draft = {}, onDraft, onSubmit, submitting, justSaved, error
}) {
  // Teams are TBD when null (knockout matches before qualification)
  const homeIsLabel = !match.home_team
  const awayIsLabel = !match.away_team
  const isTBD = homeIsLabel || awayIsLabel

  const isKnockout    = isKnockoutMatch(match.group_stage)
  const effectiveOpen = open && !isTBD
  const isUpdate      = !!pred

  // Get stadium timezone from stadiums map
  const stadium   = stadiums[match.stadium_id]
  const timezone  = stadium?.timezone || 'America/New_York'
  const timeInfo  = toParisTime(match.local_date_raw, timezone, match.match_date, match.match_time)
  const rawStadium = getStadiumName(match.stadium_id, stadiums) || match.stadium || match.city || ''
  const stadiumDisplay = rawStadium.includes('·') ? rawStadium.split('·')[0].trim() : rawStadium

  // Display name: use label when team is null (TBD knockout)
  const homeDisplay = homeIsLabel
    ? (match.home_team_label || 'À déterminer')
    : match.home_team
  const awayDisplay = awayIsLabel
    ? (match.away_team_label || 'À déterminer')
    : match.away_team

  // Real-time consistency validation
  const hasScores = draft.home !== undefined && draft.home !== '' &&
                    draft.away !== undefined && draft.away !== ''
  const consistencyError = effectiveOpen && hasScores && draft.winner
    ? validatePrediction(draft.home, draft.away, draft.winner, isKnockout)
    : null

  const impliedWinner = hasScores
    ? Number(draft.home) > Number(draft.away) ? 'home'
    : Number(draft.home) < Number(draft.away) ? 'away'
    : 'draw'
    : null

  // Derive winner from scores when API doesn't provide it
  const matchWinner = match.winner ||
    (match.status === 'finished' && match.home_score != null
      ? match.home_score > match.away_score ? 'home'
      : match.home_score < match.away_score ? 'away'
      : 'draw'
      : null)

  // Points calculation
  const pts = pred && match.home_score != null
    ? calcPoints(
        { home_score: pred.home_score, away_score: pred.away_score, winner_pick: pred.winner_pick },
        { home_score: match.home_score, away_score: match.away_score, winner: matchWinner }
      )
    : null

  const ptsCls   = pts===10?'badge-gold':pts===5?'badge-green':pts===3?'badge-blue':'badge-gray'
  const ptsLabel = pts===10?'Score parfait !':pts===5?'Bon vainqueur !':pts===3?'Un score juste !':pts===0?'Raté.':''
  const canSave  = !submitting && !(consistencyError && hasScores && draft.winner)
  const showScore = true

  return (
    <div className={`mc mc-${match.status}${isTBD?' mc-tbd':''}`}>
      {match.status === 'live' && <div className="mc-live-bar"/>}

      {/* Header */}
      <div className="mc-head">
        <span className="mc-group">
          {match.group_stage}
          {match.api_id && <span className="mc-match-id"> · Match {match.api_id}</span>}
        </span>
        <div className="mc-badges">
          <span className={`badge ${match.status==='live'?'badge-red':match.status==='finished'?'badge-gray':'badge-purple'}`}>
            {match.status==='live'&&<span className="live-dot"/>}
            {STATUS_FR[match.status]}
          </span>
          {isKnockout&&<span className="badge badge-gold ko-badge">Élimination</span>}
        </div>
        <span className="mc-time">{timeInfo.full}</span>
      </div>

      {/* Teams + Score */}
      <div className="mc-teams">
        <div className="mc-team home">
          {match.home_flag && <Flag url={match.home_flag} name={homeDisplay}/>}
          <span className="mc-team-name">{homeDisplay}</span>
        </div>

        <div className="mc-center">
          {showScore ? (
            <>
              <div className="mc-score-live display">
                <span>{match.home_score ?? 0}</span>
                <span className="mc-score-sep">–</span>
                <span>{match.away_score ?? 0}</span>
              </div>
              {match.home_penalty!=null&&match.away_penalty!=null&&(
                <div className="mc-penalty">pen. {match.home_penalty}–{match.away_penalty}</div>
              )}
            </>
          ) : (
            <div className="mc-vs">VS</div>
          )}
          {stadiumDisplay&&<div className="mc-city">🏟 {stadiumDisplay}</div>}
        </div>

        <div className="mc-team away">
          <span className="mc-team-name">{awayDisplay}</span>
          {match.away_flag && <Flag url={match.away_flag} name={awayDisplay}/>}
        </div>
      </div>

      {/* Prediction Section */}
      <div className="mc-prediction">

        {/* TBD — show label info */}
        {isTBD&&(
          <div className="mc-tbd-msg">
            ⏳ Équipes à déterminer — les pronostics s'ouvriront dès la confirmation des équipes
          </div>
        )}

        {/* Open form */}
        {effectiveOpen&&(
          <div className="mc-pred-open">
            <div className={`pred-context ${isUpdate?'pred-context-update':'pred-context-new'}`}>
              {isUpdate
                ?<>✏️ <strong>Modifier votre pronostic</strong> — saisissez de nouveaux scores et validez.</>
                :<>🎯 <strong>Saisissez votre pronostic</strong> avant le coup d'envoi. Modifiable jusqu'au début du match.</>
              }
            </div>

            <div className="pred-section-label">📊 Score prédit <span className="pred-label-hint">(90 minutes)</span></div>
            <div className="pred-score-row">
              <div className="pred-score-block">
                <div className="pred-score-label">{homeDisplay}</div>
                <input type="number" min="0" max="20" className="score-in" placeholder="0"
                  value={draft.home??''} onChange={e=>onDraft('home',e.target.value)}/>
              </div>
              <div className="pred-score-dash">–</div>
              <div className="pred-score-block">
                <div className="pred-score-label">{awayDisplay}</div>
                <input type="number" min="0" max="20" className="score-in" placeholder="0"
                  value={draft.away??''} onChange={e=>onDraft('away',e.target.value)}/>
              </div>
            </div>

            <div className="pred-winner-section">
              <div className="pred-section-label">
                🏆 Vainqueur prédit
                {isKnockout&&<span className="pred-ko-hint"> — Pas de nul possible</span>}
              </div>
              <div className="pred-winner-btns">
                <button className={`winner-btn${draft.winner==='home'?' selected home-sel':impliedWinner==='home'&&!draft.winner?' implied':''}`}
                  onClick={()=>onDraft('winner',draft.winner==='home'?null:'home')} type="button">
                  {homeDisplay}
                </button>
                {!isKnockout&&(
                  <button className={`winner-btn winner-btn-draw${draft.winner==='draw'?' selected draw-sel':impliedWinner==='draw'&&!draft.winner?' implied':''}`}
                    onClick={()=>onDraft('winner',draft.winner==='draw'?null:'draw')} type="button">
                    Match nul
                  </button>
                )}
                <button className={`winner-btn${draft.winner==='away'?' selected away-sel':impliedWinner==='away'&&!draft.winner?' implied':''}`}
                  onClick={()=>onDraft('winner',draft.winner==='away'?null:'away')} type="button">
                  {awayDisplay}
                </button>
              </div>
            </div>

            {error&&!consistencyError&&<div className="pred-error">⚠️ {error}</div>}
            {consistencyError&&<div className="pred-warning">{consistencyError}</div>}

            <button className="btn btn-primary pred-submit" onClick={onSubmit} disabled={!canSave}>
              {submitting?'⏳ Enregistrement...'
                :isUpdate?'✏️ Mettre à jour mon pronostic'
                :'✅ Valider mon pronostic'}
            </button>
          </div>
        )}

        {/* Confirmed prediction */}
        {!effectiveOpen&&!isTBD&&pred&&(
          <div className={`mc-pred-confirmed${justSaved?' mc-just-saved':''}`}>
            <div className="pred-conf-header">
              <span className="pred-conf-badge">✅ Pronostic enregistré</span>
              {match.status==='upcoming'&&
                <span className="pred-conf-hint">Modifiable avant le coup d'envoi sur la page Matchs</span>}
            </div>
            <div className="pred-conf-body">
              <div className="pred-conf-left">
                <span className="pred-conf-score">{pred.home_score} – {pred.away_score}</span>
                <span className="pred-conf-winner">🏆 {getWinnerLabel(pred.winner_pick,homeDisplay,awayDisplay)}</span>
              </div>
              <div className="pred-conf-right">
                {pts!=null
                  ?<><span className={`badge ${ptsCls} pts-badge`}>{pts} pts</span><span className="pred-pts-explain">{ptsLabel}</span></>
                  :<span className="pred-waiting">⏳ En attente du résultat</span>
                }
              </div>
            </div>
          </div>
        )}

        {/* No prediction + not open */}
        {!effectiveOpen&&!isTBD&&!pred&&(
          <div className="mc-pred-closed">
            {match.status==='upcoming'?'🔒 Pronostic ouvert avant le coup d\'envoi':'— Aucun pronostic soumis'}
          </div>
        )}
      </div>
    </div>
  )
}
