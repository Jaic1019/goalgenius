import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { calcPoints } from '../lib/scoring'
import './MatchCard.css'

const STATUS_FR = { upcoming: 'À venir', live: 'En direct', finished: 'Terminé' }

function Flag({ url, name, size = 40 }) {
  const [err, setErr] = useState(false)
  if (!url || url === '🏳️') return <div className="flag-fb" style={{width:size,height:Math.round(size*0.67)}}>{name?.[0]??'?'}</div>
  // Emoji flag: not a URL and not a file path
  const isEmoji = !url.startsWith('http') && !url.includes('.') && !url.includes('/')
  if (isEmoji) return <span className="flag-emoji" style={{fontSize:Math.round(size*0.75)}}>{url}</span>
  if (err) return <div className="flag-fb" style={{width:size,height:Math.round(size*0.67)}}>{name?.[0]??'?'}</div>
  return <img src={url} alt={name} className="flag-img" style={{width:size,height:Math.round(size*0.67)}} onError={()=>setErr(true)}/>
}

export default function MatchCard({ match, pred, open, draft={}, onDraft, onSubmit, submitting, error, successMsg }) {
  const isTBD = !match.home_team || !match.away_team ||
    match.home_team.trim().toUpperCase()==='TBD' || match.away_team.trim().toUpperCase()==='TBD'
  const effectiveOpen = open && !isTBD
  const isUpdate = !!pred

  const pts = pred && match.home_score != null
    ? calcPoints({home_score:pred.home_score,away_score:pred.away_score,winner_pick:pred.winner_pick}, match)
    : null

  let dateStr = ''
  try { dateStr = format(parseISO(match.match_date),'EEE d MMM',{locale:fr}) } catch {}

  const ptsCls   = pts===10?'badge-gold':pts===5?'badge-green':pts===3?'badge-blue':'badge-gray'
  const ptsEmoji = pts===10?'🏆 ':pts===5?'⭐ ':pts===3?'👍 ':''

  return (
    <div className={`mc mc-${match.status}${isTBD?' mc-tbd':''}`}>
      {match.status==='live' && <div className="mc-live-bar"/>}

      <div className="mc-head">
        <span className="mc-group">{match.group_stage}</span>
        <span className={`badge ${match.status==='live'?'badge-red':match.status==='finished'?'badge-gray':'badge-purple'}`}>
          {match.status==='live'&&<span className="live-dot"/>}
          {STATUS_FR[match.status]}
        </span>
        <span className="mc-time">{dateStr} · {match.match_time?.slice(0,5)} CET</span>
      </div>

      <div className="mc-teams">
        <div className="mc-team home">
          <Flag url={match.home_flag} name={match.home_team}/>
          <span className="mc-team-name">{isTBD?'À déterminer':match.home_team}</span>
        </div>
        <div className="mc-center">
          {match.home_score!=null
            ? <div className="mc-score-live display">{match.home_score}<span className="mc-score-sep">–</span>{match.away_score}</div>
            : <div className="mc-vs alt">VS</div>
          }
          {(match.city||match.stadium) && <div className="mc-city">🏟 {match.city||match.stadium}</div>}
        </div>
        <div className="mc-team away">
          <span className="mc-team-name">{isTBD?'À déterminer':match.away_team}</span>
          <Flag url={match.away_flag} name={match.away_team}/>
        </div>
      </div>

      <div className="mc-prediction">
        {/* TBD */}
        {isTBD && (
          <div className="mc-tbd-msg">⏳ Équipes à déterminer — pronostics disponibles dès confirmation</div>
        )}

        {/* Open for prediction */}
        {effectiveOpen && (
          <div className="mc-pred-open">
            <div className={`pred-context ${isUpdate?'pred-context-update':'pred-context-new'}`}>
              {isUpdate
                ? <>✏️ <strong>Modifier votre pronostic</strong> — entrez de nouveaux scores et validez pour écraser l'ancien.</>
                : <>🎯 <strong>Soumettez votre pronostic</strong> avant le coup d'envoi. Modifiable jusqu'au début du match.</>
              }
            </div>

            <div className="pred-section-label">📊 Score prédit</div>
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

            <div className="pred-winner-section">
              <div className="pred-section-label">🏆 Vainqueur prédit</div>
              <div className="pred-winner-btns">
                <button className={`winner-btn${draft.winner==='home'?' selected home-selected':''}`}
                  onClick={()=>onDraft('winner',draft.winner==='home'?null:'home')} type="button">
                  {match.home_team}
                </button>
                <button className={`winner-btn winner-btn-draw${draft.winner==='draw'?' selected draw-selected':''}`}
                  onClick={()=>onDraft('winner',draft.winner==='draw'?null:'draw')} type="button">
                  Match nul
                </button>
                <button className={`winner-btn${draft.winner==='away'?' selected away-selected':''}`}
                  onClick={()=>onDraft('winner',draft.winner==='away'?null:'away')} type="button">
                  {match.away_team}
                </button>
              </div>
            </div>

            {error && <div className="pred-error">⚠️ {error}</div>}

            <button className="btn btn-primary pred-submit" onClick={onSubmit} disabled={submitting}>
              {submitting?'Enregistrement...':isUpdate?'✏️ Mettre à jour mon pronostic':'✅ Valider mon pronostic'}
            </button>
          </div>
        )}

        {/* Success message */}
        {successMsg && <div className="pred-success">{successMsg}</div>}

        {/* Already predicted - show summary */}
        {!effectiveOpen && !isTBD && pred && (
          <div className="mc-pred-done">
            <div className="pred-done-header">
              <span className="pred-done-title">✅ Votre pronostic</span>
              {match.status==='upcoming' && <span className="pred-done-edit-hint">Allez sur la page Matchs pour modifier</span>}
            </div>
            <div className="pred-done-row">
              <div className="pred-done-scores">
                <span className="pred-done-score">{pred.home_score} – {pred.away_score}</span>
                <span className="pred-done-winner-lbl">
                  🏆 {pred.winner_pick==='home'?match.home_team:pred.winner_pick==='away'?match.away_team:pred.winner_pick==='draw'?'Match nul':'—'}
                </span>
              </div>
              {pts!=null
                ? <span className={`badge ${ptsCls} pts-badge`}>{ptsEmoji}{pts} pts</span>
                : <span className="pred-waiting">⏳ En attente du résultat</span>
              }
            </div>
            {pts!=null && (
              <div className="pred-points-explain">
                {pts===10&&'🏆 Score parfait — vainqueur et score exacts !'}
                {pts===5&&'⭐ Bon vainqueur — continuez comme ça !'}
                {pts===3&&'👍 Un score juste — pas loin !'}
                {pts===0&&'❌ Raté cette fois — bonne chance pour le prochain !'}
              </div>
            )}
          </div>
        )}

        {/* No prediction, not open */}
        {!effectiveOpen && !isTBD && !pred && (
          <div className="mc-pred-closed">
            {match.status==='upcoming'
              ? '🔒 Pronostics ouverts avant le coup d\'envoi'
              : '— Aucun pronostic soumis pour ce match'}
          </div>
        )}
      </div>
    </div>
  )
}
