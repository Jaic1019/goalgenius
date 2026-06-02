import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { calcPoints } from '../lib/scoring'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import './Matches.css'

const STATUS_FR   = { upcoming: 'À venir', live: '🔴 En direct', finished: 'Terminé' }
const STATUS_KEY  = { upcoming: 'upcoming', live: 'live', finished: 'finished' }

const STAGES = [
  'Tous',
  'Phase de groupes',
  'Top 16',
  'Quarts de finale',
  'Demi-finales',
  'Finale',
]

// Which group_stage values belong to each stage bucket
function stageBucket(groupStage) {
  if (!groupStage) return 'Phase de groupes'
  const g = groupStage.toLowerCase()
  if (g.includes('groupe') || g.includes('group')) return 'Phase de groupes'
  if (g.includes('32') || g.includes('top 16') || g.includes('huitième') || g.includes('round of')) return 'Top 16'
  if (g.includes('quart') || g.includes('quarter')) return 'Quarts de finale'
  if (g.includes('demi') || g.includes('semi')) return 'Demi-finales'
  if (g.includes('finale') || g.includes('final')) return 'Finale'
  return 'Phase de groupes'
}

export default function Matches() {
  const { user } = useAuth()
  const [matches, setMatches]     = useState([])
  const [predictions, setPredictions] = useState({})
  const [drafts, setDrafts]       = useState({})
  const [saving, setSaving]       = useState({})
  const [alert, setAlert]         = useState(null)
  const [loading, setLoading]     = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [stageFilter, setStageFilter]   = useState('Tous')
  const [teamSearch, setTeamSearch]     = useState('')

  const loadAll = useCallback(async () => {
    const [{ data: matchData }, { data: predData }] = await Promise.all([
      supabase.from('matches').select('*').order('match_date').order('match_time'),
      supabase.from('predictions').select('*').eq('user_id', user.id),
    ])
    setMatches(matchData || [])
    const predMap = {}
    for (const p of (predData || [])) predMap[p.match_id] = p
    setPredictions(predMap)
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    loadAll()
    const interval = setInterval(() => {
      supabase.from('matches').select('*').order('match_date').order('match_time')
        .then(({ data }) => { if (data) setMatches(data) })
    }, 60000)
    return () => clearInterval(interval)
  }, [loadAll])

  // ── Filtering ──
  const filtered = useMemo(() => {
    return matches.filter(m => {
      if (statusFilter !== 'Tous' && m.status !== STATUS_KEY[statusFilter === 'À venir' ? 'upcoming' : statusFilter === 'En direct' ? 'live' : 'finished']) {
        // map FR label → key
        const map = { 'À venir': 'upcoming', 'En direct': 'live', 'Terminés': 'finished' }
        if (m.status !== map[statusFilter]) return false
      }
      if (stageFilter !== 'Tous' && stageBucket(m.group_stage) !== stageFilter) return false
      if (teamSearch.trim()) {
        const q = teamSearch.trim().toLowerCase()
        if (!m.home_team?.toLowerCase().includes(q) && !m.away_team?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [matches, statusFilter, stageFilter, teamSearch])

  const live     = filtered.filter(m => m.status === 'live')
  const upcoming = filtered.filter(m => m.status === 'upcoming')
  const finished = filtered.filter(m => m.status === 'finished')

  // ── Prediction helpers ──
  function canPredict(match) {
    if (match.status !== 'upcoming') return false
    const matchDT = new Date(`${match.match_date}T${match.match_time}`)
    return new Date() < matchDT
  }

  function setDraft(matchId, side, value) {
    setDrafts(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value === '' ? '' : Math.max(0, parseInt(value) || 0) } }))
  }

  async function submitPrediction(match) {
    const d = drafts[match.id] || {}
    const home = d.home !== undefined && d.home !== '' ? Number(d.home) : null
    const away = d.away !== undefined && d.away !== '' ? Number(d.away) : null
    if (home === null || away === null || isNaN(home) || isNaN(away)) {
      showAlert('Entrez les deux scores avant de valider.', 'error'); return
    }
    setSaving(p => ({ ...p, [match.id]: true }))
    const { error } = await supabase.from('predictions').upsert(
      { user_id: user.id, match_id: match.id, home_score: home, away_score: away },
      { onConflict: 'user_id,match_id' }
    )
    if (!error) {
      setPredictions(p => ({ ...p, [match.id]: { home_score: home, away_score: away } }))
      setDrafts(p => { const n = { ...p }; delete n[match.id]; return n })
      showAlert('Pronostic enregistré ! 🎯', 'success')
    } else showAlert('Erreur lors de la sauvegarde.', 'error')
    setSaving(p => ({ ...p, [match.id]: false }))
  }

  function showAlert(msg, type) { setAlert({ msg, type }); setTimeout(() => setAlert(null), 3000) }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>

  return (
    <div className="matches-page fade-up">
      <div className="page-header">
        <h1 className="display page-title">Calendrier des matchs</h1>
        <p className="page-sub">Soumettez vos pronostics avant le coup d'envoi. Verrouillé au début du match.</p>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}

      {/* ── Filters ── */}
      <div className="filters-bar">

        {/* Status filter */}
        <div className="filter-group">
          <span className="filter-label">Statut</span>
          <div className="filter-pills">
            {['Tous', 'À venir', 'En direct', 'Terminés'].map(s => (
              <button key={s} className={`filter-pill ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
          </div>
        </div>

        {/* Stage filter */}
        <div className="filter-group">
          <span className="filter-label">Phase</span>
          <div className="filter-pills">
            {STAGES.map(s => (
              <button key={s} className={`filter-pill ${stageFilter === s ? 'active' : ''}`}
                onClick={() => setStageFilter(s)}>{s}</button>
            ))}
          </div>
        </div>

        {/* Team search */}
        <div className="filter-group">
          <span className="filter-label">Équipe</span>
          <input
            className="team-search"
            placeholder="Rechercher une équipe…"
            value={teamSearch}
            onChange={e => setTeamSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Match sections ── */}
      {live.length === 0 && upcoming.length === 0 && finished.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: 40 }}>🔍</div>
          <p>Aucun match ne correspond aux filtres sélectionnés.</p>
          <button className="btn btn-ghost btn-sm" onClick={() => { setStatusFilter('Tous'); setStageFilter('Tous'); setTeamSearch('') }}>
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {live.length > 0 && (
        <section className="match-section">
          <div className="section-label live-label">🔴 En direct</div>
          {live.map(m => <MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false} />)}
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="match-section">
          <div className="section-label">À venir</div>
          {upcoming.map(m => (
            <MatchCard key={m.id} match={m} pred={predictions[m.id]}
              open={canPredict(m)}
              draft={drafts[m.id] || {}}
              onDraft={(side, val) => setDraft(m.id, side, val)}
              onSubmit={() => submitPrediction(m)}
              submitting={saving[m.id]}
            />
          ))}
        </section>
      )}

      {finished.length > 0 && (
        <section className="match-section">
          <div className="section-label">Terminés</div>
          {finished.map(m => <MatchCard key={m.id} match={m} pred={predictions[m.id]} open={false} />)}
        </section>
      )}
    </div>
  )
}

function MatchCard({ match, pred, open, draft = {}, onDraft, onSubmit, submitting }) {
  const pts = pred && match.home_score !== null
    ? calcPoints({ home_score: pred.home_score, away_score: pred.away_score }, match)
    : null

  const dateStr = (() => {
    try { return format(parseISO(match.match_date), 'EEE d MMM', { locale: fr }) } catch { return match.match_date }
  })()

  const ptsBadgeClass = pts === 10 ? 'badge-gold' : pts >= 5 ? 'badge-green' : pts > 0 ? 'badge-blue' : 'badge-gray'

  return (
    <div className={`match-card ${match.status}`}>
      <div className="match-card-header">
        <span className="match-group">{match.group_stage}</span>
        <span className={`badge ${match.status === 'live' ? 'badge-red' : match.status === 'finished' ? 'badge-gray' : 'badge-green'}`}>
          {STATUS_FR[match.status]}
        </span>
        <span className="match-datetime">{dateStr} · {match.match_time?.slice(0, 5)}</span>
      </div>

      <div className="match-teams">
        <div className="team home">
          <span className="team-flag">{match.home_flag}</span>
          <span className="team-name">{match.home_team}</span>
        </div>
        <div className="match-score-block">
          {match.home_score !== null
            ? <span className="score-final">{match.home_score} – {match.away_score}</span>
            : <span className="score-vs">VS</span>}
        </div>
        <div className="team away">
          <span className="team-name">{match.away_team}</span>
          <span className="team-flag">{match.away_flag}</span>
        </div>
      </div>

      <div className="match-prediction-row">
        {open ? (
          <div className="predict-inputs">
            <span className="predict-label">Votre pronostic :</span>
            <input type="number" min="0" max="20" className="score-input" placeholder="0"
              value={draft.home ?? ''} onChange={e => onDraft('home', e.target.value)} />
            <span className="predict-dash">–</span>
            <input type="number" min="0" max="20" className="score-input" placeholder="0"
              value={draft.away ?? ''} onChange={e => onDraft('away', e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={onSubmit} disabled={submitting}>
              {submitting ? '…' : 'Valider'}
            </button>
          </div>
        ) : pred ? (
          <div className="pred-summary">
            <span className="pred-pick">
              Votre pronostic : <strong>{pred.home_score} – {pred.away_score}</strong>
            </span>
            {pts !== null
              ? <span className={`badge ${ptsBadgeClass}`}>{pts === 10 ? '🏆 ' : pts >= 7 ? '⭐ ' : ''}{pts} pts</span>
              : <span className="pred-waiting">En attente du résultat</span>
            }
          </div>
        ) : (
          <span className="pred-closed">
            {match.status === 'upcoming' ? "Pronostics ouverts avant le coup d'envoi" : 'Aucun pronostic soumis'}
          </span>
        )}
      </div>
    </div>
  )
}
