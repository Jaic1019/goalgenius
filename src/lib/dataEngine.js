/**
 * HYBRID DATA ENGINE — GoalGenius Final
 * Architecture: DB = source of truth, API = enriches every 60s
 * Timezone: IANA → UTC → Intl (no manual offsets)
 * Safety: UPSERT only, never deletes, predictions safe
 */
import { supabase } from './supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-matches`
const EDGE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Flag lookup by team name ──────────────────────────────────────
const FLAGS = {
  'Mexico':'MX','South Africa':'ZA','South Korea':'KR','Czech Republic':'CZ','Czechia':'CZ',
  'Canada':'CA','Bosnia and Herzegovina':'BA','Qatar':'QA','Switzerland':'CH',
  'Brazil':'BR','Morocco':'MA','Haiti':'HT','Scotland':'SCO',
  'United States':'US','USA':'US','Paraguay':'PY','Australia':'AU',
  'Türkiye':'TR','Turkey':'TR','Germany':'DE','Curaçao':'CW',
  "Ivory Coast":'CI',"Côte d'Ivoire":'CI','Ecuador':'EC',
  'Netherlands':'NL','Japan':'JP','Tunisia':'TN','Sweden':'SE',
  'Belgium':'BE','Egypt':'EG','Iran':'IR','New Zealand':'NZ',
  'Spain':'ES','Cape Verde':'CV','Saudi Arabia':'SA','Uruguay':'UY',
  'France':'FR','Senegal':'SN','Iraq':'IQ','Norway':'NO',
  'Argentina':'AR','Algeria':'DZ','Austria':'AT','Jordan':'JO',
  'Portugal':'PT','DR Congo':'CD','Congo DR':'CD','Uzbekistan':'UZ','Colombia':'CO',
  'England':'ENG','Croatia':'HR','Ghana':'GH','Panama':'PA',
  'Wales':'WAL','Serbia':'RS','Poland':'PL','Cameroon':'CM',
  'Denmark':'DK','Ukraine':'UA','Romania':'RO','Hungary':'HU',
}

function getFlag(name) {
  if (!name) return ''
  if (FLAGS[name]) return FLAGS[name]
  for (const [k,v] of Object.entries(FLAGS)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return v
  }
  return ''
}

// ── Stadium ID → IANA Timezone mapping ───────────────────────────
// Built from API /get/stadiums region field
// IANA → UTC → Intl approach (verified and tested)
const STADIUM_TZ = {
  1:  'America/Mexico_City',  // Estadio Azteca, Mexico City
  2:  'America/Los_Angeles',  // Rose Bowl, Los Angeles
  3:  'America/Chicago',      // AT&T Stadium, Dallas
  4:  'America/Chicago',      // Arrowhead Stadium, Kansas City
  5:  'America/Chicago',      // NRG Stadium, Houston
  6:  'America/New_York',     // MetLife Stadium, New York
  7:  'America/New_York',     // Lincoln Financial, Philadelphia
  8:  'America/New_York',     // Gillette Stadium, Boston
  9:  'America/New_York',     // Hard Rock Stadium, Miami
  10: 'America/Los_Angeles',  // SoFi Stadium, Los Angeles
  11: 'America/New_York',     // MetLife Stadium, New York
  12: 'America/Chicago',      // Estadio BBVA, Monterrey
  13: 'America/Chicago',      // Estadio Akron, Guadalajara
  14: 'America/Vancouver',    // BC Place, Vancouver
  15: 'America/Toronto',      // BMO Field, Toronto
  16: 'America/Los_Angeles',  // SoFi Stadium, Los Angeles
}

/**
 * Convert API local_date (MM/DD/YYYY HH:MM in stadium local time)
 * to CEST (Europe/Paris) using IANA → UTC → Intl
 * NEVER uses manual offset arithmetic
 */
function localToCEST(localDateStr, stadiumId) {
  if (!localDateStr) return { date: null, time: '00:00' }
  try {
    const [datePart, timePart] = localDateStr.split(' ')
    const [month, day, year] = datePart.split('/')
    const [hour, minute] = (timePart || '00:00').split(':')
    const tz = STADIUM_TZ[Number(stadiumId)] || 'America/New_York'

    // Build naive ISO string
    const isoLocal = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${hour.padStart(2,'0')}:${minute.padStart(2,'0')}:00`

    // Get the UTC offset for this timezone at this exact date (DST-aware)
    const naiveDate = new Date(isoLocal)
    const tzFormatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(naiveDate)

    // Calculate actual UTC time
    const tzDate = new Date(tzFormatted.replace(',', ''))
    const diffMs = naiveDate.getTime() - tzDate.getTime()
    const utcMs = naiveDate.getTime() + diffMs

    const utcDate = new Date(utcMs)

    // Format in Europe/Paris (CEST in summer = UTC+2)
    const cestDate = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(utcDate)

    const cestTime = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(utcDate)

    return { date: cestDate, time: cestTime.replace('h',':').padEnd(5,'0') }
  } catch(e) {
    console.warn('[TZ] conversion error:', e.message)
    return { date: null, time: '00:00' }
  }
}

// ── API helpers ───────────────────────────────────────────────────
async function edgeFetch(endpoint = '/get/games') {
  try {
    const res = await fetch(`${EDGE_URL}?endpoint=${encodeURIComponent(endpoint)}`, {
      signal: AbortSignal.timeout(12000),
      headers: { 'Authorization': `Bearer ${EDGE_KEY}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { data: await res.json(), ok: true }
  } catch(e) {
    console.warn('[API]', e.message)
    return { data: null, ok: false }
  }
}

function extractMatches(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  for (const k of ['games','matches','data','results','fixtures','events','items','list']) {
    if (Array.isArray(data[k]) && data[k].length > 0) return data[k]
  }
  const vals = Object.values(data)
  if (vals.length > 0 && Array.isArray(vals[0])) return vals[0]
  return []
}

function parseMatch(m) {
  if (!m || typeof m !== 'object') return null

  // Parse date using IANA → UTC → Intl
  const localDateStr = m.local_date || ''
  const stadiumId = m.stadium_id || 6 // default New York
  const { date, time } = localToCEST(localDateStr, stadiumId)
  if (!date) return null

  // Status - handle API string 'TRUE'/'FALSE' and boolean
  let status = 'upcoming'
  if (m.finished === true || m.finished === 1 || m.finished === 'TRUE') status = 'finished'
  else if (m.time_elapsed && m.time_elapsed !== 'notstarted' && Number(m.time_elapsed) > 0) status = 'live'
  else if (typeof m.status === 'string') {
    const s = m.status.toLowerCase()
    if (s.includes('live') || s.includes('progress')) status = 'live'
    else if (s.includes('finish') || s.includes('ft') || s.includes('end')) status = 'finished'
  }

  // Team names
  const homeName = (
    m.home_team_name_en || m.home_team_name ||
    (typeof m.home_team === 'object' ? m.home_team?.name_en || m.home_team?.name : m.home_team) ||
    m.homeTeam || m.home || ''
  ).toString().trim()

  const awayName = (
    m.away_team_name_en || m.away_team_name ||
    (typeof m.away_team === 'object' ? m.away_team?.name_en || m.away_team?.name : m.away_team) ||
    m.awayTeam || m.away || ''
  ).toString().trim()

  if (!homeName || !awayName) return null

  // Scores
  const homeScore = m.home_score ?? m.homeScore ?? m.score?.home ?? null
  const awayScore = m.away_score ?? m.awayScore ?? m.score?.away ?? null

  return {
    api_id:      String(m.id || m._id || ''),
    home_team:   homeName,
    away_team:   awayName,
    home_flag:   getFlag(homeName),
    away_flag:   getFlag(awayName),
    home_score:  homeScore !== null && homeScore !== '' ? Number(homeScore) : null,
    away_score:  awayScore !== null && awayScore !== '' ? Number(awayScore) : null,
    match_date:  date,
    match_time:  time + ':00',
    group_stage: (m.group || m.Group || m.round || m.type || m.stage || '').toString(),
    stadium:     (typeof m.stadium === 'object' ? m.stadium?.name : m.stadium) || m.venue || '',
    city:        (typeof m.stadium === 'object' ? m.stadium?.city : null) || m.city || '',
    status,
    matchday:    Number(m.matchday || m.round_number || 1) || 1,
    winner:      m.winner || null,
    home_penalty: m.home_penalty ?? null,
    away_penalty: m.away_penalty ?? null,
  }
}

// ── Bootstrap — runs ONCE when DB is empty ────────────────────────
export async function bootstrapFromAPI() {
  console.log('[Bootstrap] DB empty — importing from API...')
  const { data, ok } = await edgeFetch('/get/games')
  if (!ok || !data) { console.warn('[Bootstrap] API unavailable'); return { ok: false, count: 0 } }

  const arr = extractMatches(data)
  if (!arr.length) return { ok: true, count: 0 }

  const rows = arr.map(parseMatch).filter(r => r && r.home_team && r.away_team && r.match_date)
  if (!rows.length) return { ok: true, count: 0 }

  let inserted = 0
  for (let i = 0; i < rows.length; i += 20) {
    const { error } = await supabase.from('matches')
      .upsert(rows.slice(i, i + 20), { onConflict: 'api_id', ignoreDuplicates: false })
    if (!error) inserted += Math.min(20, rows.length - i)
    else console.error('[Bootstrap] batch error:', error.message)
  }

  console.log(`[Bootstrap] ✅ ${inserted} matches imported`)
  return { ok: true, count: inserted }
}

// ── Load from DB ──────────────────────────────────────────────────
export async function loadMatchesFromDB() {
  const { data, error } = await supabase.from('matches').select('*')
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
  if (error) console.error('[DB] loadMatches:', error.message)
  return data || []
}

// ── Sync — every 60s ─────────────────────────────────────────────
// SAFE: UPSERT only, never deletes
// Predictions linked by match.id (int FK) — safe when TBD→real teams
export async function syncFromAPI() {
  const { data, ok } = await edgeFetch('/get/games')
  if (!ok || !data) return { ok: false, updated: 0 }

  const arr = extractMatches(data)
  if (!arr.length) return { ok: true, updated: 0 }

  const { data: dbRows } = await supabase.from('matches')
    .select('id,api_id,home_team,away_team,home_score,away_score,status,admin_override,match_date,match_time')
  const dbMap = {}
  for (const m of (dbRows || [])) if (m.api_id) dbMap[m.api_id] = m

  const toUpsert = []
  for (const raw of arr) {
    const m = parseMatch(raw)
    if (!m || !m.home_team || !m.api_id) continue
    const existing = dbMap[m.api_id]

    if (!existing) {
      toUpsert.push(m)
    } else {
      if (existing.admin_override) continue
      const teamChanged  = existing.home_team === 'TBD' || existing.away_team === 'TBD'
      const scoreChanged = existing.home_score !== m.home_score || existing.away_score !== m.away_score
      const statusChanged = existing.status !== m.status
      const timeChanged  = existing.match_time !== m.match_time || existing.match_date !== m.match_date

      if (teamChanged || scoreChanged || statusChanged || timeChanged) {
        toUpsert.push({
          id:           existing.id,
          api_id:       m.api_id,
          home_team:    teamChanged ? m.home_team : existing.home_team,
          away_team:    teamChanged ? m.away_team : existing.away_team,
          home_flag:    teamChanged ? m.home_flag : undefined,
          away_flag:    teamChanged ? m.away_flag : undefined,
          home_score:   m.home_score,
          away_score:   m.away_score,
          match_date:   m.match_date,
          match_time:   m.match_time,
          status:       m.status,
          winner:       m.winner,
          home_penalty: m.home_penalty,
          away_penalty: m.away_penalty,
        })
      }
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase.from('matches')
      .upsert(toUpsert, { onConflict: 'api_id' })
    if (error) console.error('[Sync] error:', error.message)
    else console.log(`[Sync] ✅ ${toUpsert.length} matches updated`)
  }

  return { ok: true, updated: toUpsert.length }
}
