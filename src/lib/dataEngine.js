/**
 * MOTEUR DE DONNÉES HYBRIDE — GoalGenius v6
 * Structure API worldcup26.ir confirmée :
 * - date: local_date
 * - teams: home_team_name_en, away_team_name_en
 * - scores: home_score, away_score
 * - status: finished (boolean)
 * - group: group
 * - stadium: stadium_id
 */
import { supabase } from './supabase'

const CET_OFFSET = 2
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-matches`
const EDGE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Flag emoji lookup by team name
const FLAGS = {
  'Mexico':'🇲🇽','South Africa':'🇿🇦','South Korea':'🇰🇷','Czech Republic':'🇨🇿','Czechia':'🇨🇿',
  'Canada':'🇨🇦','Bosnia and Herzegovina':'🇧🇦','Qatar':'🇶🇦','Switzerland':'🇨🇭',
  'Brazil':'🇧🇷','Morocco':'🇲🇦','Haiti':'🇭🇹','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'United States':'🇺🇸','USA':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺','Türkiye':'🇹🇷','Turkey':'🇹🇷',
  'Germany':'🇩🇪','Curaçao':'🇨🇼','Ivory Coast':'🇨🇮',"Côte d'Ivoire":'🇨🇮','Ecuador':'🇪🇨',
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
  // partial match
  for (const [k,v] of Object.entries(FLAGS)) {
    if (name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())) return v
  }
  return '🏳️'
}

function toCET(localDate, timeStr) {
  if (!localDate) return { date: null, time: '18:00' }
  try {
    // local_date is already in local time — just parse it
    // Format could be: "2026-06-11" or "2026-06-11T13:00:00" or "06/11/2026"
    let dateStr = String(localDate)
    let timeOut = timeStr || '18:00'

    if (dateStr.includes('T')) {
      // ISO format with time
      const dt = new Date(dateStr)
      if (!isNaN(dt)) {
        // Convert UTC to CET
        const cet = new Date(dt.getTime() + CET_OFFSET * 3600000)
        return { date: cet.toISOString().slice(0,10), time: cet.toISOString().slice(11,16) }
      }
    }

    // Plain date
    const plain = dateStr.slice(0,10)
    if (plain.match(/^\d{4}-\d{2}-\d{2}$/)) return { date: plain, time: timeOut }

    // MM/DD/YYYY
    if (plain.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [m,d,y] = plain.split('/')
      return { date: `${y}-${m}-${d}`, time: timeOut }
    }

    return { date: plain, time: timeOut }
  } catch { return { date: null, time: '18:00' } }
}

async function edgeFetch(endpoint = '/get/games') {
  try {
    const res = await fetch(`${EDGE_URL}?endpoint=${encodeURIComponent(endpoint)}`, {
      signal: AbortSignal.timeout(12000),
      headers: { 'Authorization': `Bearer ${EDGE_KEY}`, 'Content-Type': 'application/json' },
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
    if (Array.isArray(data[k]) && data[k].length > 0) return data[k]
  }
  const vals = Object.values(data)
  if (vals.length > 0 && Array.isArray(vals[0])) return vals[0]
  return []
}

function parseMatch(m) {
  if (!m || typeof m !== 'object') return null

  // ── Date & Time ──
  // Keys confirmed: local_date, persian_date, matchday
  const rawDate = m.local_date || m.date || m.match_date || m.Date || ''
  const rawTime = m.time || m.match_time || m.Time || m.kickoff || ''
  const { date, time } = toCET(rawDate, rawTime)
  if (!date) return null

  // ── Team names ──
  // Keys confirmed: home_team_name_en, away_team_name_en
  const homeName = (m.home_team_name_en || m.home_team_name || m.home_name ||
    (m.home_team && typeof m.home_team === 'object' ? m.home_team.name_en || m.home_team.name : m.home_team) ||
    m.homeTeam || m.home || '').toString().trim()

  const awayName = (m.away_team_name_en || m.away_team_name || m.away_name ||
    (m.away_team && typeof m.away_team === 'object' ? m.away_team.name_en || m.away_team.name : m.away_team) ||
    m.awayTeam || m.away || '').toString().trim()

  if (!homeName || !awayName) return null

  // ── Status ──
  // Keys confirmed: finished (boolean), type, time_elapsed
  let status = 'upcoming'
  if (m.finished === true || m.finished === 1 || m.finished === '1' || m.finished === 'true') {
    status = 'finished'
  } else if (m.time_elapsed && Number(m.time_elapsed) > 0 && !m.finished) {
    status = 'live'
  } else if (m.status) {
    const s = String(m.status).toLowerCase()
    if (s.includes('live') || s.includes('progress')) status = 'live'
    else if (s.includes('finish') || s.includes('ft') || s.includes('end')) status = 'finished'
  }

  // ── Scores ──
  const homeScore = m.home_score !== null && m.home_score !== undefined && m.home_score !== ''
    ? Number(m.home_score) : null
  const awayScore = m.away_score !== null && m.away_score !== undefined && m.away_score !== ''
    ? Number(m.away_score) : null

  // ── Group ──
  const groupStage = (m.group || m.Group || m.round || m.type || m.stage || '').toString()

  // ── Stadium ──
  const stadium = m.stadium_id ? `Stadium ${m.stadium_id}` : ''
  const city = ''

  // ── API ID ──
  const apiId = String(m.id || m._id || '')

  return {
    api_id:      apiId,
    home_team:   homeName,
    away_team:   awayName,
    home_flag:   getFlag(homeName),
    away_flag:   getFlag(awayName),
    home_score:  homeScore,
    away_score:  awayScore,
    match_date:  date,
    match_time:  time + ':00',
    group_stage: groupStage,
    stadium,
    city,
    status,
    matchday:    Number(m.matchday || 1) || 1,
  }
}

// ── Bootstrap ────────────────────────────────────────────────

export async function bootstrapFromAPI() {
  console.log('[Bootstrap] DB vide — import depuis API...')
  const { data, ok } = await edgeFetch('/get/games')
  if (!ok || !data) { console.warn('[Bootstrap] API indisponible'); return { ok: false, count: 0 } }

  const arr = extractMatches(data)
  console.log(`[Bootstrap] ${arr.length} matchs bruts reçus`)
  if (!arr.length) return { ok: true, count: 0 }

  // Log first match for debugging
  console.log('[Bootstrap] Premier match brut:', JSON.stringify(arr[0]).slice(0, 400))

  const rows = arr.map(parseMatch).filter(r => r && r.home_team && r.away_team && r.match_date)
  console.log(`[Bootstrap] ${rows.length} matchs valides`)

  if (rows.length === 0) {
    console.error('[Bootstrap] 0 matchs valides. Premier élément brut:', JSON.stringify(arr[0]))
    return { ok: true, count: 0 }
  }

  let inserted = 0
  for (let i = 0; i < rows.length; i += 20) {
    const { error } = await supabase.from('matches')
      .upsert(rows.slice(i, i + 20), { onConflict: 'api_id', ignoreDuplicates: false })
    if (error) console.error('[Bootstrap] Erreur batch:', error.message)
    else inserted += Math.min(20, rows.length - i)
  }

  console.log(`[Bootstrap] ✅ ${inserted} matchs insérés`)
  return { ok: true, count: inserted }
}

// ── DB reads ──────────────────────────────────────────────────

export async function loadMatchesFromDB() {
  const { data, error } = await supabase.from('matches').select('*')
    .order('match_date', { ascending: true }).order('match_time', { ascending: true })
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
