/**
 * HYBRID DATA ENGINE — GoalGenius Final
 *
 * Architecture:
 * - DB = source of truth (works even if API is down)
 * - API = enriches DB every 60s via UPSERT (never deletes)
 * - local_date_raw + stadium_id stored raw from API
 * - Time conversion happens in BROWSER only using stadium timezone from DB
 * - Predictions safe: linked by match.id (integer FK)
 */
import { supabase } from './supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-matches`
const EDGE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Flag lookup by team name → stores ISO code in DB ─────────────
const FLAGS = {
  'Mexico':'MX','South Africa':'ZA','South Korea':'KR','Czech Republic':'CZ','Czechia':'CZ',
  'Canada':'CA','Bosnia and Herzegovina':'BA','Qatar':'QA','Switzerland':'CH',
  'Brazil':'BR','Morocco':'MA','Haiti':'HT','Scotland':'SCO',
  'United States':'US','USA':'US','Paraguay':'PY','Australia':'AU',
  'Turkiye':'TR','Turkey':'TR','Germany':'DE','Curacao':'CW','Curaçao':'CW',
  'Ivory Coast':'CI','Ecuador':'EC',
  'Netherlands':'NL','Japan':'JP','Tunisia':'TN','Sweden':'SE',
  'Belgium':'BE','Egypt':'EG','Iran':'IR','New Zealand':'NZ',
  'Spain':'ES','Cape Verde':'CV','Saudi Arabia':'SA','Uruguay':'UY',
  'France':'FR','Senegal':'SN','Iraq':'IQ','Norway':'NO',
  'Argentina':'AR','Algeria':'DZ','Austria':'AT','Jordan':'JO',
  'Portugal':'PT','DR Congo':'CD','Congo DR':'CD','Democratic Republic of the Congo':'CD',
  'Uzbekistan':'UZ','Colombia':'CO',
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

// ── Stage mapping from API group codes to French labels ───────────
function mapStage(group, type) {
  const g = (group || '').toString().toUpperCase().trim()
  const t = (type  || '').toString().toLowerCase().trim()
  if (g === 'R32'   || t === 'r32')   return '16e de finale'
  if (g === 'R16'   || t === 'r16')   return 'Huitièmes de finale'
  if (g === 'QF'    || t === 'qf')    return 'Quarts de finale'
  if (g === 'SF'    || t === 'sf')    return 'Demi-finales'
  if (g === '3RD'   || t === 'third') return 'Match pour la 3ème place'
  if (g === 'FINAL' || t === 'final') return 'Finale'
  // Group stage — return as-is (A, B, C ... L)
  return (group || '').toString()
}

// ── Status parser ─────────────────────────────────────────────────
function parseStatus(m) {
  if (m.finished === true || m.finished === 1 || m.finished === 'TRUE') return 'finished'
  if (m.time_elapsed && m.time_elapsed !== 'notstarted' && Number(m.time_elapsed) > 0) return 'live'
  const s = String(m.status || '').toLowerCase()
  if (s.includes('live') || s.includes('progress')) return 'live'
  if (s.includes('finish') || s.includes('ft') || s.includes('end')) return 'finished'
  return 'upcoming'
}

// ── Parse match date from local_date raw string ───────────────────
// API format: "MM/DD/YYYY HH:MM"
function parseMatchDate(localDate) {
  if (!localDate) return { match_date: null, match_time: null }
  try {
    const [datePart, timePart] = localDate.split(' ')
    const [month, day, year] = datePart.split('/')
    return {
      match_date: `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`,
      match_time: (timePart || '00:00') + ':00',
    }
  } catch { return { match_date: null, match_time: null } }
}

// ── Parse match from API ──────────────────────────────────────────
function parseMatch(m) {
  if (!m || typeof m !== 'object') return null

  const apiId = String(m.id || m._id || '')
  if (!apiId) return null

  // For group matches: use team names. For knockout (home_team_id=0): use labels
  const isKnockout = String(m.home_team_id) === '0' || String(m.away_team_id) === '0'

  const homeLabel = (m.home_team_label || '').toString().trim()
  const awayLabel = (m.away_team_label || '').toString().trim()

  const homeName = isKnockout
    ? (homeLabel || 'TBD')
    : (m.home_team_name_en || m.home_team_name ||
       (typeof m.home_team === 'object' ? m.home_team?.name_en : m.home_team) || '').toString().trim()

  const awayName = isKnockout
    ? (awayLabel || 'TBD')
    : (m.away_team_name_en || m.away_team_name ||
       (typeof m.away_team === 'object' ? m.away_team?.name_en : m.away_team) || '').toString().trim()

  if (!homeName || !awayName) return null

  const { match_date, match_time } = parseMatchDate(m.local_date)
  const homeScore = (m.home_score !== null && m.home_score !== undefined && m.home_score !== '' && m.home_score !== 'null')
    ? Number(m.home_score) : null
  const awayScore = (m.away_score !== null && m.away_score !== undefined && m.away_score !== '' && m.away_score !== 'null')
    ? Number(m.away_score) : null

  return {
    api_id:           apiId,
    home_team:        homeName,
    away_team:        awayName,
    home_team_label:  homeLabel || null,
    away_team_label:  awayLabel || null,
    home_flag:        isKnockout ? '' : getFlag(homeName),
    away_flag:        isKnockout ? '' : getFlag(awayName),
    local_date_raw:   m.local_date || null,
    stadium_id:       m.stadium_id ? Number(m.stadium_id) : null,
    match_date,
    match_time,
    group_stage:      mapStage(m.group, m.type),
    stadium:          (typeof m.stadium === 'object' ? m.stadium?.name : m.stadium) || m.venue || '',
    city:             (typeof m.stadium === 'object' ? m.stadium?.city : null) || m.city || '',
    status:           parseStatus(m),
    matchday:         Number(m.matchday || 1) || 1,
    winner:           m.winner || null,
    home_penalty:     m.home_penalty ?? null,
    away_penalty:     m.away_penalty ?? null,
    home_score:       homeScore,
    away_score:       awayScore,
  }
}

// ── API fetch ─────────────────────────────────────────────────────
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
  return []
}

// ── Load stadiums from DB ─────────────────────────────────────────
export async function loadStadiumsFromDB() {
  const { data, error } = await supabase.from('stadiums').select('*').order('id')
  if (error) console.error('[DB stadiums]', error.message)
  const map = {}
  for (const s of (data || [])) map[s.id] = s
  return map
}

// ── Bootstrap — runs ONCE when DB empty ──────────────────────────
export async function bootstrapFromAPI() {
  const { data, ok } = await edgeFetch('/get/games')
  if (!ok || !data) return { ok: false, count: 0 }
  const arr = extractMatches(data)
  if (!arr.length) return { ok: true, count: 0 }
  const rows = arr.map(parseMatch).filter(r => r && r.api_id)
  if (!rows.length) return { ok: true, count: 0 }
  let inserted = 0
  for (let i = 0; i < rows.length; i += 20) {
    const { error } = await supabase.from('matches')
      .upsert(rows.slice(i, i + 20), { onConflict: 'api_id', ignoreDuplicates: false })
    if (!error) inserted += Math.min(20, rows.length - i)
    else console.error('[Bootstrap]', error.message)
  }
  return { ok: true, count: inserted }
}

// ── Load from DB ──────────────────────────────────────────────────
export async function loadMatchesFromDB() {
  const { data, error } = await supabase.from('matches').select('*')
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
  if (error) console.error('[DB]', error.message)
  return data || []
}

// ── Sync — every 60s, UPSERT only, never deletes ─────────────────
export async function syncFromAPI() {
  const { data, ok } = await edgeFetch('/get/games')
  if (!ok || !data) return { ok: false, updated: 0 }
  const arr = extractMatches(data)
  if (!arr.length) return { ok: true, updated: 0 }

  // Load existing DB rows for comparison
  const { data: dbRows } = await supabase.from('matches')
    .select('id,api_id,home_team,away_team,home_score,away_score,status,winner,local_date_raw,stadium_id,admin_override')
  const dbMap = {}
  for (const m of (dbRows || [])) if (m.api_id) dbMap[m.api_id] = m

  const toUpsert = []

  for (const raw of arr) {
    const m = parseMatch(raw)
    if (!m || !m.api_id) continue
    const existing = dbMap[m.api_id]

    if (!existing) {
      // New match — insert everything
      toUpsert.push(m)
    } else {
      if (existing.admin_override) continue

      // Existing match — only update what API is responsible for
      // NEVER overwrite match_date, match_time (already set from API on insert)
      const isKnockout = String(raw.home_team_id) === '0' || String(raw.away_team_id) === '0'
      const teamsChanged = (existing.home_team === 'TBD' || existing.away_team === 'TBD') && !isKnockout
      const scoreChanged = existing.home_score !== m.home_score || existing.away_score !== m.away_score
      const statusChanged = existing.status !== m.status
      const winnerChanged = existing.winner !== m.winner
      const dateChanged = existing.local_date_raw !== m.local_date_raw || existing.stadium_id !== m.stadium_id

      if (teamsChanged || scoreChanged || statusChanged || winnerChanged || dateChanged) {
        toUpsert.push({
          api_id:          m.api_id,
          home_team:       isKnockout ? existing.home_team : m.home_team,
          away_team:       isKnockout ? existing.away_team : m.away_team,
          home_flag:       isKnockout ? existing.home_flag : m.home_flag,
          away_flag:       isKnockout ? existing.away_flag : m.away_flag,
          local_date_raw:  m.local_date_raw,
          stadium_id:      m.stadium_id,
          home_score:      m.home_score,
          away_score:      m.away_score,
          status:          m.status,
          winner:          m.winner,
          // home_penalty + away_penalty only if API provides them
          ...(m.home_penalty !== null ? { home_penalty: m.home_penalty } : {}),
          ...(m.away_penalty !== null ? { away_penalty: m.away_penalty } : {}),
        })
      }
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase.from('matches').upsert(toUpsert, { onConflict: 'api_id' })
    if (error) console.error('[Sync]', error.message)
    else console.log(`[Sync] ✅ ${toUpsert.length} updated`)
  } else {
    console.log('[Sync] ✅ No changes')
  }

  return { ok: true, updated: toUpsert.length }
}
