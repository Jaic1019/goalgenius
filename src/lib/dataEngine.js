/**
 * HYBRID DATA ENGINE — GoalGenius Final
 *
 * Architecture:
 * - DB (Supabase) = single source of truth
 * - API (worldcup26.ir via Edge Function) = enriches DB silently
 * - Bootstrap: runs ONCE when DB is empty
 * - Sync: every 60s — UPSERT only, never deletes, never touches predictions
 * - Knockout: when API fills TBD teams, UPSERT updates by api_id — predictions safe (linked by match.id not team name)
 */
import { supabase } from './supabase'

const CET_OFFSET = 2 // CEST = UTC+2 during World Cup
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-matches`
const EDGE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Emoji flag lookup — all 48 WC 2026 teams
const FLAGS = {
  'Mexico':'🇲🇽','South Africa':'🇿🇦','South Korea':'🇰🇷','Czech Republic':'🇨🇿','Czechia':'🇨🇿',
  'Canada':'🇨🇦','Bosnia and Herzegovina':'🇧🇦','Qatar':'🇶🇦','Switzerland':'🇨🇭',
  'Brazil':'🇧🇷','Morocco':'🇲🇦','Haiti':'🇭🇹','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'United States':'🇺🇸','USA':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺',
  'Türkiye':'🇹🇷','Turkey':'🇹🇷','Germany':'🇩🇪','Curaçao':'🇨🇼',
  'Ivory Coast':'🇨🇮',"Côte d'Ivoire":'🇨🇮','Ecuador':'🇪🇨',
  'Netherlands':'🇳🇱','Japan':'🇯🇵','Tunisia':'🇹🇳','Sweden':'🇸🇪',
  'Belgium':'🇧🇪','Egypt':'🇪🇬','Iran':'🇮🇷','New Zealand':'🇳🇿',
  'Spain':'🇪🇸','Cape Verde':'🇨🇻','Saudi Arabia':'🇸🇦','Uruguay':'🇺🇾',
  'France':'🇫🇷','Senegal':'🇸🇳','Iraq':'🇮🇶','Norway':'🇳🇴',
  'Argentina':'🇦🇷','Algeria':'🇩🇿','Austria':'🇦🇹','Jordan':'🇯🇴',
  'Portugal':'🇵🇹','DR Congo':'🇨🇩','Congo DR':'🇨🇩','Uzbekistan':'🇺🇿','Colombia':'🇨🇴',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croatia':'🇭🇷','Ghana':'🇬🇭','Panama':'🇵🇦',
  'Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿','Serbia':'🇷🇸','Poland':'🇵🇱','Cameroon':'🇨🇲',
  'Denmark':'🇩🇰','Ukraine':'🇺🇦','Romania':'🇷🇴','Hungary':'🇭🇺',
}

function getFlag(name) {
  if (!name) return ''
  if (FLAGS[name]) return FLAGS[name]
  for (const [k,v] of Object.entries(FLAGS)) {
    if (name.toLowerCase().includes(k.toLowerCase())||k.toLowerCase().includes(name.toLowerCase())) return v
  }
  return '🏳️'
}

function toCET(dateStr, timeStr) {
  if (!dateStr) return { date: null, time: '18:00' }
  try {
    const clean = (timeStr||'00:00').toString().slice(0,5)
    const dt = new Date(`${dateStr}T${clean}:00Z`)
    if (isNaN(dt)) return { date: dateStr, time: clean }
    dt.setHours(dt.getHours() + CET_OFFSET)
    return { date: dt.toISOString().slice(0,10), time: dt.toISOString().slice(11,16) }
  } catch { return { date: dateStr, time: '18:00' } }
}

async function edgeFetch(endpoint='/get/games') {
  try {
    const res = await fetch(`${EDGE_URL}?endpoint=${encodeURIComponent(endpoint)}`, {
      signal: AbortSignal.timeout(12000),
      headers: { 'Authorization':`Bearer ${EDGE_KEY}`, 'Content-Type':'application/json' },
    })
    if (!res.ok) throw new Error(`Edge HTTP ${res.status}`)
    return { data: await res.json(), ok: true }
  } catch (e) {
    console.warn('[API] edgeFetch failed:', e.message)
    return { data: null, ok: false }
  }
}

function extractMatches(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  for (const k of ['games','matches','data','results','fixtures','events','items','list']) {
    if (Array.isArray(data[k]) && data[k].length>0) return data[k]
  }
  const vals = Object.values(data)
  if (vals.length>0 && Array.isArray(vals[0])) return vals[0]
  return []
}

function parseMatch(m) {
  if (!m || typeof m !== 'object') return null

  const rawDate = m.local_date || m.date || m.match_date || m.Date || ''
  const rawTime = m.time || m.match_time || m.Time || m.kickoff || '00:00'
  const { date, time } = toCET(String(rawDate).slice(0,10), String(rawTime).slice(0,5))
  if (!date) return null

  // Status — confirmed API field: finished (boolean), time_elapsed (number)
  let status = 'upcoming'
  if (m.finished===true||m.finished===1) status='finished'
  else if (m.time_elapsed && Number(m.time_elapsed)>0) status='live'
  else if (typeof m.status==='string') {
    const s = m.status.toLowerCase()
    if (s.includes('live')||s.includes('progress')) status='live'
    else if (s.includes('finish')||s.includes('ft')||s.includes('end')) status='finished'
  }

  // Team names — confirmed API fields: home_team_name_en, away_team_name_en
  const homeName = (
    m.home_team_name_en || m.home_team_name ||
    (typeof m.home_team==='object' ? m.home_team?.name_en||m.home_team?.name : m.home_team) ||
    m.homeTeam || m.home || ''
  ).toString().trim()

  const awayName = (
    m.away_team_name_en || m.away_team_name ||
    (typeof m.away_team==='object' ? m.away_team?.name_en||m.away_team?.name : m.away_team) ||
    m.awayTeam || m.away || ''
  ).toString().trim()

  if (!homeName || !awayName) return null

  // Scores
  const homeScore = (m.home_score??m.homeScore??m.score?.home??null)
  const awayScore = (m.away_score??m.awayScore??m.score?.away??null)

  return {
    api_id:      String(m.id||m._id||''),
    home_team:   homeName,
    away_team:   awayName,
    home_flag:   getFlag(homeName),
    away_flag:   getFlag(awayName),
    home_score:  homeScore!==null&&homeScore!==''?Number(homeScore):null,
    away_score:  awayScore!==null&&awayScore!==''?Number(awayScore):null,
    match_date:  date,
    match_time:  time+':00',
    group_stage: (m.group||m.Group||m.round||m.type||m.stage||'').toString(),
    stadium:     (typeof m.stadium==='object'?m.stadium?.name:m.stadium)||m.venue||m.ground||'',
    city:        (typeof m.stadium==='object'?m.stadium?.city:null)||m.city||'',
    status,
    matchday:    Number(m.matchday||m.round_number||1)||1,
  }
}

// ── Bootstrap — ONCE when DB is empty ────────────────────────

export async function bootstrapFromAPI() {
  console.log('[Bootstrap] DB vide — import depuis API...')
  const { data, ok } = await edgeFetch('/get/games')
  if (!ok||!data) { console.warn('[Bootstrap] API indisponible'); return {ok:false,count:0} }

  const arr = extractMatches(data)
  console.log(`[Bootstrap] ${arr.length} matchs reçus de l'API`)
  if (!arr.length) return {ok:true,count:0}

  console.log('[Bootstrap] Premier match brut:', JSON.stringify(arr[0]).slice(0,300))

  const rows = arr.map(parseMatch).filter(r=>r&&r.home_team&&r.away_team&&r.match_date)
  console.log(`[Bootstrap] ${rows.length} matchs valides sur ${arr.length}`)
  if (!rows.length) return {ok:true,count:0}

  let inserted = 0
  for (let i=0; i<rows.length; i+=20) {
    const {error} = await supabase.from('matches')
      .upsert(rows.slice(i,i+20), {onConflict:'api_id',ignoreDuplicates:false})
    if (error) console.error('[Bootstrap] Erreur batch:', error.message)
    else inserted += Math.min(20,rows.length-i)
  }

  console.log(`[Bootstrap] ✅ ${inserted} matchs importés`)
  return {ok:true,count:inserted}
}

// ── DB reads ──────────────────────────────────────────────────

export async function loadMatchesFromDB() {
  const {data,error} = await supabase.from('matches').select('*')
    .order('match_date',{ascending:true}).order('match_time',{ascending:true})
  if (error) console.error('[DB] loadMatches:', error.message)
  return data||[]
}

// ── Sync — every 60s ─────────────────────────────────────────
// SAFE: only updates scores/status/team names via UPSERT ON CONFLICT api_id
// Predictions are linked by match.id (integer FK) — not affected by team name changes

export async function syncFromAPI() {
  const {data,ok} = await edgeFetch('/get/games')
  if (!ok||!data) return {ok:false,updated:0}

  const arr = extractMatches(data)
  if (!arr.length) return {ok:true,updated:0}

  const {data:dbRows} = await supabase.from('matches')
    .select('id,api_id,home_team,away_team,home_score,away_score,status,admin_override')
  const dbMap = {}
  for (const m of (dbRows||[])) if (m.api_id) dbMap[m.api_id]=m

  const toUpsert = []
  for (const raw of arr) {
    const m = parseMatch(raw)
    if (!m||!m.home_team||!m.api_id) continue
    const existing = dbMap[m.api_id]

    if (!existing) {
      // New match from API (not in our pre-created fixtures)
      toUpsert.push(m)
    } else {
      if (existing.admin_override) continue // respect manual override

      const teamChanged  = existing.home_team==='TBD'||existing.away_team==='TBD'
      const scoreChanged = existing.home_score!==m.home_score||existing.away_score!==m.away_score
      const statusChanged= existing.status!==m.status

      if (teamChanged||scoreChanged||statusChanged) {
        // Update: team names (TBD→real), scores, status
        // NEVER deletes — predictions with match_id=existing.id remain safe
        toUpsert.push({
          id:         existing.id,
          api_id:     m.api_id,
          home_team:  teamChanged ? m.home_team : existing.home_team,
          away_team:  teamChanged ? m.away_team : existing.away_team,
          home_flag:  teamChanged ? m.home_flag : undefined,
          away_flag:  teamChanged ? m.away_flag : undefined,
          home_score: m.home_score,
          away_score: m.away_score,
          status:     m.status,
        })
      }
    }
  }

  if (toUpsert.length>0) {
    const {error} = await supabase.from('matches').upsert(toUpsert,{onConflict:'api_id'})
    if (error) console.error('[Sync] Erreur:', error.message)
    else console.log(`[Sync] ✅ ${toUpsert.length} matchs mis à jour`)
  }

  return {ok:true,updated:toUpsert.length}
}
