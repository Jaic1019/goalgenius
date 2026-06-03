import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { calcPoints, validatePrediction } from '../lib/scoring'
import './MatchCard.css'

const STATUS_FR = { upcoming: 'À venir', live: 'En direct', finished: 'Terminé' }

function Flag({ url, name, size = 40 }) {
  const [err, setErr] = useState(false)
  if (!url || url === '🏳️') return (
    <div className="flag-fb" style={{width:size,height:Math.round(size*0.67)}}>{name?.[0]??'?'}</div>
  )
  const isEmoji = !url.startsWith('http') && !url.includes('.') && !url.includes('/')
  if (isEmoji) return <span className="flag-emoji" style={{fontSize:Math.round(size*0.75)}}>{url}</span>
  if (err) return <div className="flag-fb" style={{width:size,height:Math.round(size*0.67)}}>{name?.[0]??'?'}</div>
  return <img src={url} alt={name} className="flag-img"
    style={{width:size,height:Math.round(size*0.67)}} onError={()=>setErr(true)}/>
}

function isKnockoutMatch(groupStage) {
  if (!groupStage) return false
  const s = groupStage.toLowerCase()
  return s.includes('r32')||s.includes('r16')||s.includes('top 32')||s.includes('top 16')||
    s.includes('quart')||s.includes('qf')||s.includes('semi')||s.includes('demi')||s.includes('sf')||
    s.includes('final')||s.includes('finale')||s.includes('3ème')||s.includes('3rd')
}

function displayScore(match) {
  if (match.home_score == null) return null
  const base = `${match.home_score}–${match.away_score}`
  if (match.home_penalty != null && match.away_penalty != null) {
    return { main: base, pen: `pen. ${match.home_penalty}–${match.away_penalty}` }
  }
  return { main: base, pen: null }
}

export default function MatchCard({ match, pred, open, draft={}, onDraft, onSubmit, submitting, justSaved }) {
  const isTBD = !match.home_team || !match.away_team ||
    match.home_team.trim().toUpperCase()==='TBD' || match.away_team.trim().toUpperCase()==='TBD'

  const isKnockout = isKnockoutMatch(match.group_stage)
  const effectiveOpen = open && !isTBD
  const isUpdate = !!pred

  // Real-time consistency validation (shown while typing)
  const consistencyError = effectiveOpen
    ? validatePrediction(draft.home, draft.away, draft.winner, isKnockout)
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

  const score = displayScore(match)
  const ptsCls   = pts===10?'badge-gold':pts===5?'badge-green':pts===3?'badge-blue':'badge-gray'
  const ptsEmoji = pts===10?'🏆 ':pts===5?'⭐ ':pts===3?'👍 ':''

  const winnerLabel = (wp) => {
    if (!wp) return '—'
    if (wp==='home') return match.home_team
    if (wp==='away') return match.away_team
    return 'Match nul'
  }

  // Implied winner from score (for button highlighting)
  const impliedWinner = (draft.home!==''&&draft.home!==undefined&&draft.away!==''&&draft.away!==undefined)
    ? Number(draft.home)>Number(draft.away)?'home':Number(draft.home)<Number(draft.away)?'away':'draw'
    : null

  return (
    <div className={`mc mc-${match.status}${isTBD?' mc-tbd':''}`}>
      {match.status==='live' && <div className="mc-live-bar"/>}

      {/* Header */}
      <div className="mc-head">
        <span className="mc-group">{match.group_stage}</span>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span className={`badge ${match.status==='live'?'badge-red':match.status==='finished'?'badge-gray':'badge-purple'}`}>
            {match.status==='live'&&<span className="live-dot"/>}
            {STATUS_FR[match.status]}
          </span>
          {isKnockout && <span className="badge badge-gold" style={{fontSize:9}}>Élimination</span>}
        </div>
        <span className="mc-time">{dateStr} · {match.match_time?.slice(0,5)} CET</span>
      </div>

      {/* Teams + Score */}
      <div className="mc-teams">
        <div className="mc-team home">
          <Flag url={match.home_flag} name={match.home_team}/>
          <span className="mc-team-name">{isTBD?'À déterminer':match.home_team}</span>
        </div>

        <div className="mc-center">
          {score
            ? <>
                <div className="mc-score-live display">{score.main.replace('–','').split('').join('')
                  .replace(/(\d+)(\d+)/,'$1')
                }
                  {/* render properly */}
                  <span style={{display:'flex',alignItems:'center',gap:4}}>
                    <span>{match.home_score}</span>
                    <span className="mc-score-sep">–</span>
                    <span>{match.away_score}</span>
                  </span>
                </div>
                {score.pen && <div className="mc-penalty">{score.pen}</div>}
              </>
            : <div className="mc-vs alt">VS</div>
          }
          {(match.city||match.stadium)&&<div className="mc-city">🏟 {match.city||match.stadium}</div>}
        </div>

        <div className="mc-team away">
          <span className="mc-team-name">{isTBD?'À déterminer':match.away_team}</span>
          <Flag url={match.away_flag} name={match.away_team}/>
        </div>
      </div>

      {/* Prediction section */}
      <div className="mc-prediction">

        {/* TBD */}
        {isTBD && (
          <div className="mc-tbd-msg">
            ⏳ Équipes à déterminer — les pronostics s'ouvriront automatiquement dès confirmation des équipes
          </div>
        )}

        {/* Open for prediction */}
        {effectiveOpen && (
          <div className="mc-pred-open">
            {/* Context message */}
            <div className={`pred-context ${isUpdate?'pred-context-update':'pred-context-new'}`}>
              {isUpdate
                ? <>✏️ <strong>Modifier votre pronostic</strong> — saisissez de nouveaux scores et validez. Votre ancien pronostic sera remplacé.</>
                : <>🎯 <strong>Saisissez votre pronostic</strong> avant le coup d'envoi. Vous pouvez le modifier jusqu'au début du match.</>
              }
            </div>

            {/* Score inputs */}
            <div className="pred-section-label">📊 Score prédit (90 minutes)</div>
            <div className="pred-score-row">
              <div className="pred-score-block">
                <div className="pred-score-label">{match.home_team}</div>
                <input type="number" min="0" max="20" className="score-in" placeholder="0"
                  value={draft.home??''} onChange={e=>onDraft('home',e.target.value)}/>
              </div>
              <div className="pred-score-dash">–</div>
              <div className="pred-score-block">
                <div className="pred-score-label">{match.away_team}</div>
                <input type="number" min="0" max="20" className="score-in" placeholder="0"
                  value={draft.away??''} onChange={e=>onDraft('away',e.target.value)}/>
              </div>
            </div>

            {/* Winner selection */}
            <div className="pred-winner-section">
              <div className="pred-section-label">
                🏆 Vainqueur prédit
                {isKnockout && <span className="knockout-hint"> — Match à élimination directe (pas de nul possible)</span>}
              </div>
              <div className="pred-winner-btns">
                <button
                  className={`winner-btn${draft.winner==='home'?' selected home-sel':impliedWinner==='home'&&!draft.winner?' implied':''}`}
                  onClick={()=>onDraft('winner',draft.winner==='home'?null:'home')} type="button">
                  {match.home_team}
                </button>
                {/* Hide Draw button for knockout matches */}
                {!isKnockout && (
                  <button
                    className={`winner-btn winner-btn-draw${draft.winner==='draw'?' selected draw-sel':impliedWinner==='draw'&&!draft.winner?' implied':''}`}
                    onClick={()=>onDraft('winner',draft.winner==='draw'?null:'draw')} type="button">
                    Match nul
                  </button>
                )}
                <button
                  className={`winner-btn${draft.winner==='away'?' selected away-sel':impliedWinner==='away'&&!draft.winner?' implied':''}`}
                  onClick={()=>onDraft('winner',draft.winner==='away'?null:'away')} type="button">
                  {match.away_team}
                </button>
              </div>
            </div>

            {/* Consistency warning - shown in real time */}
            {consistencyError && draft.winner && (draft.home!==undefined&&draft.home!=='') && (draft.away!==undefined&&draft.away!=='') && (
              <div className="pred-warning">{consistencyError}</div>
            )}

            {/* Submit button */}
            <button className="btn btn-primary pred-submit" onClick={onSubmit} disabled={submitting||!!(consistencyError&&draft.winner&&draft.home!==''&&draft.away!=='')}>
              {submitting?'Enregistrement...'
                :isUpdate?'✏️ Mettre à jour mon pronostic'
                :'✅ Valider mon pronostic'}
            </button>
          </div>
        )}

        {/* Confirmed prediction — shown after save */}
        {!effectiveOpen && !isTBD && pred && (
          <div className={`mc-pred-confirmed${justSaved?' mc-just-saved':''}`}>
            <div className="pred-conf-header">
              <span className="pred-conf-badge">✅ Pronostic enregistré</span>
              {match.status==='upcoming' &&
                <span className="pred-conf-hint">Modifiable sur la page Matchs avant le coup d'envoi</span>}
            </div>
            <div className="pred-conf-body">
              <div className="pred-conf-scores">
                <span className="pred-conf-score">{pred.home_score} – {pred.away_score}</span>
                <span className="pred-conf-winner">🏆 {winnerLabel(pred.winner_pick)}</span>
              </div>
              <div className="pred-conf-right">
                {pts!=null
                  ? <>
                      <span className={`badge ${ptsCls} pts-badge`}>{ptsEmoji}{pts} pts</span>
                      <span className="pred-pts-explain">
                        {pts===10&&'Score parfait !'}
                        {pts===5&&'Bon vainqueur !'}
                        {pts===3&&'Un score juste !'}
                        {pts===0&&'Raté cette fois.'}
                      </span>
                    </>
                  : <span className="pred-waiting">⏳ En attente du résultat</span>
                }
              </div>
            </div>
          </div>
        )}

        {/* No prediction yet + not open */}
        {!effectiveOpen && !isTBD && !pred && (
          <div className="mc-pred-closed">
            {match.status==='upcoming'
              ? '🔒 Pronostic ouvert avant le coup d\'envoi'
              : '— Aucun pronostic soumis pour ce match'}
          </div>
        )}
      </div>
    </div>
  )
}
