/**
 * MOTEUR DE DONNÉES HYBRIDE — GoalGenius v6
 * DB = source de vérité, API = enrichissement live via Edge Function
 */
import { supabase } from './supabase'

const CET_OFFSET = 2
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-matches`
const EDGE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function toCET(dateStr, timeStr) {
  if (!dateStr) return { date: null, time: '18:00' }
  try {
    const clean = (timeStr || '00:00').toString().slice(0, 5)
    const dt = new Date(`${dateStr}T${clean}:00Z`)
    if (isNaN(dt)) return { date: dateStr, time: clean }
    dt.setHours(dt.getHours() + CET_OFFSET)
    return { date: dt.toISOString().slice(0, 10), time: dt.toISOString().slice(11, 16) }
  } catch { return { date: dateStr, time: '18:00' } }
}

async function edgeFetch(endpoint = '/get/games') {
  try {
    const res = await fetch(`${EDGE_URL}?endpoint=${encodeURIComponent(endpoint)}`, {
      signal: AbortSignal.timeout(12000),
      headers: { 'Authorization': `Bearer ${EDGE_KEY}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Edge HTTP ${res.status}`)
    const json = await res.json()
    return { data: json, ok: true }
  } catch (e) {
    console.warn('[API] edgeFetch failed:', e.message)
    return { data: null, ok: false }
  }
}

function extractMatches(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  const keys = ['games','matches','data','results','fixtures','events','items','list']
  for (const k of keys) {
    if (Array.isArray(data[k]) && data[k].length > 0) {
      console.log(`[API] Found ${data[k].length} items under key: "${k}"`)
      return data[k]
    }
  }
  const vals = Object.values(data)
  if (vals.length > 0 && Array.isArray(vals[0]) && vals[0].length > 0) return vals[0]
  return []
}

// Deep search any object for a value by multiple possible keys
function deepGet(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
    // Try case-insensitive
    const lk = k.toLowerCase()
    for (const ok of Object.keys(obj)) {
      if (ok.toLowerCase() === lk && obj[ok] !== undefined && obj[ok] !== null && obj[ok] !== '') return obj[ok]
    }
  }
  return null
}

function parseMatch(m) {
  if (!m || typeof m !== 'object') return null

  // Log the first match to understand structure
  if (!parseMatch._logged) {
    console.log('[API] Sample match object:', JSON.stringify(m).slice(0, 500))
    parseMatch._logged = true
  }

  // Extract date - try everything
  const rawDate = deepGet(m, 'date','match_date','matchDate','Date','game_date','scheduled_date','kickoff_date') ||
    (m.schedule && deepGet(m.schedule, 'date','time','kickoff')) || ''

  // Extract time
  const rawTime = deepGet(m, 'time','match_time','matchTime','Time','kickoff','kickoff_time','start_time') ||
    (m.schedule && deepGet(m.schedule, 'time','kickoff')) || '00:00'

  const { date, time } = toCET(String(rawDate).slice(0,10), String(rawTime).slice(0,5))
  if (!date) { console.warn('[Parse] No date for match:', Object.keys(m)); return null }

  // Status
  const rawStatus = String(deepGet(m, 'status','Status','state','State','match_status') || 'upcoming').toLowerCase()
  const status = rawStatus.includes('live') || rawStatus.includes('progress') || rawStatus.includes('cours') ? 'live'
    : rawStatus.includes('finish') || rawStatus.includes('ft') || rawStatus.includes('end') || rawStatus.includes('complet') || rawStatus.includes('played') ? 'finished'
    : 'upcoming'

  // Teams - handle nested objects aggressively
  let homeName = '', awayName = '', homeFlag = '', awayFlag = ''

  // Try nested team objects first
  const homeObj = m.home_team || m.homeTeam || m.home || m.team_home || m.local || null
  const awayObj = m.away_team || m.awayTeam || m.away || m.team_away || m.visitor || null

  if (homeObj && typeof homeObj === 'object') {
    homeName = deepGet(homeObj, 'name','Name','team_name','fullName','title') || ''
    homeFlag = deepGet(homeObj, 'flag','logo','image','icon','crest','badge','photo') || ''
  } else if (typeof homeObj === 'string') {
    homeName = homeObj
  }

  if (awayObj && typeof awayObj === 'object') {
    awayName = deepGet(awayObj, 'name','Name','team_name','fullName','title') || ''
    awayFlag = deepGet(awayObj, 'flag','logo','image','icon','crest','badge','photo') || ''
  } else if (typeof awayObj === 'string') {
    awayName = awayObj
  }

  // Fallback to flat fields
  if (!homeName) homeName = String(deepGet(m, 'home_name','home_team_name','team1','team1_name','homeTeamName') || '')
  if (!awayName) awayName = String(deepGet(m, 'away_name','away_team_name','team2','team2_name','awayTeamName') || '')
  if (!homeFlag) homeFlag = String(deepGet(m, 'home_flag','home_logo','home_image','team1_flag') || '')
  if (!awayFlag) awayFlag = String(deepGet(m, 'away_flag','away_logo','away_image','team2_flag') || '')

  if (!homeName || !awayName) {
    console.warn('[Parse] Missing team names. Keys:', Object.keys(m), 'homeObj:', homeObj, 'awayObj:', awayObj)
    return null
  }

  // Scores
  let homeScore = null, awayScore = null
  const scoreObj = m.score || m.Score || m.result || m.Result || null
  if (scoreObj && typeof scoreObj === 'object') {
    homeScore = deepGet(scoreObj, 'home','Home','team1','ft_home','fulltime_home') 
    awayScore = deepGet(scoreObj, 'away','Away','team2','ft_away','fulltime_away')
  }
  if (homeScore === null) homeScore = deepGet(m, 'home_score','homeScore','score_home','goals_home','team1_score')
  if (awayScore === null) awayScore = deepGet(m, 'away_score','awayScore','score_away','goals_away','team2_score')
  if (typeof homeScore === 'string' && homeScore.includes('-')) {
    [homeScore, awayScore] = homeScore.split('-').map(Number)
  }
  homeScore = homeScore !== null && homeScore !== '' ? Number(homeScore) : null
  awayScore = awayScore !== null && awayScore !== '' ? Number(awayScore) : null
  if (!isNaN(homeScore) && !isNaN(awayScore) && homeScore !== null) {} else { homeScore = null; awayScore = null }

  // Group/stage
  const groupStage = String(deepGet(m, 'group','Group','round','Round','stage','Stage','phase','group_stage','group_name','round_name') || '')

  // Stadium/city
  const stadiumObj = m.stadium || m.Stadium || m.venue || m.Venue || null
  const stadium = stadiumObj && typeof stadiumObj === 'object'
    ? deepGet(stadiumObj, 'name','Name','stadium_name') || ''
    : String(stadiumObj || deepGet(m, 'stadium_name','venue_name','ground') || '')
  const city = stadiumObj && typeof stadiumObj === 'object'
    ? deepGet(stadiumObj, 'city','City','location') || ''
    : String(deepGet(m, 'city','City','location') || '')

  const apiId = String(deepGet(m, 'id','_id','Id','match_id','game_id','fixture_id') || '')

  return {
    api_id:      apiId,
    home_team:   homeName.trim(),
    away_team:   awayName.trim(),
    home_flag:   homeFlag.trim(),
    away_flag:   awayFlag.trim(),
    home_score:  homeScore,
    away_score:  awayScore,
    match_date:  date,
    match_time:  time + ':00',
    group_stage: groupStage,
    stadium:     stadium,
    city:        city,
    status,
    matchday:    Number(deepGet(m, 'matchday','round_number','week','day','match_day') || 1) || 1,
  }
}

// ── Bootstrap ────────────────────────────────────────────────

export async function bootstrapFromAPI() {
  console.log('[Bootstrap] DB vide — import depuis API...')
  const { data, ok } = await edgeFetch('/get/games')

  if (!ok || !data) {
    console.warn('[Bootstrap] API indisponible')
    return { ok: false, count: 0 }
  }

  const arr = extractMatches(data)
  console.log(`[Bootstrap] ${arr.length} éléments bruts reçus`)
  if (!arr.length) return { ok: true, count: 0 }

  parseMatch._logged = false // reset log flag

  const rows = arr.map(parseMatch).filter(r => r && r.home_team && r.away_team && r.match_date)
  console.log(`[Bootstrap] ${rows.length} matchs valides sur ${arr.length}`)

  if (rows.length === 0) {
    console.error('[Bootstrap] Impossible de parser les matchs. Voir le log "Sample match object" ci-dessus.')
    return { ok: true, count: 0 }
  }

  let inserted = 0
  const BATCH = 20
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from('matches')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'api_id', ignoreDuplicates: false })
    if (error) console.error('[Bootstrap] Erreur batch:', error.message)
    else inserted += Math.min(BATCH, rows.length - i)
  }

  console.log(`[Bootstrap] ✅ ${inserted} matchs insérés`)
  return { ok: true, count: inserted }
}

// ── DB reads ──────────────────────────────────────────────────

export async function loadMatchesFromDB() {
  const { data, error } = await supabase
    .from('matches').select('*')
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
  if (error) console.error('[DB] loadMatches:', error.message)
  return data || []
}

// ── Sync ──────────────────────────────────────────────────────

export async function syncFromAPI() {
  const { data, ok } = await edgeFetch('/get/games')
  if (!ok || !data) return { ok: false, updated: 0 }

  const arr = extractMatches(data)
  if (!arr.length) return { ok: true, updated: 0 }

  const { data: dbRows } = await supabase.from('matches')
    .select('id, api_id, home_score, away_score, status, admin_override')
  const dbMap = {}
  for (const m of (dbRows || [])) if (m.api_id) dbMap[m.api_id] = m

  parseMatch._logged = true // suppress logging during sync
  const toUpsert = []
  for (const raw of arr) {
    const m = parseMatch(raw)
    if (!m || !m.home_team) continue
    const existing = dbMap[m.api_id]
    if (!existing) {
      toUpsert.push(m)
    } else {
      if (existing.admin_override) continue
      const changed = existing.home_score !== m.home_score || existing.away_score !== m.away_score || existing.status !== m.status
      if (changed) toUpsert.push({ id: existing.id, api_id: m.api_id, home_score: m.home_score, away_score: m.away_score, status: m.status })
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase.from('matches').upsert(toUpsert, { onConflict: 'api_id' })
    if (error) console.error('[Sync] Erreur:', error.message)
  }

  return { ok: true, updated: toUpsert.length }
}
