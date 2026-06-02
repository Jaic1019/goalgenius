/**
 * MOTEUR DE DONNÉES HYBRIDE
 * - DB Supabase = source de vérité
 * - API worldcup26.ir (via Edge Function) = enrichissement live
 * - Si API échoue → DB continue de servir les données
 */
import { supabase } from './supabase'

const CET_OFFSET = 2

// Edge Function URL
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-matches`
const EDGE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY

function toCET(dateStr, timeStr) {
  if (!dateStr) return { date: dateStr, time: '18:00' }
  try {
    const clean = (timeStr || '00:00').slice(0, 5)
    const dt = new Date(`${dateStr}T${clean}:00Z`)
    dt.setHours(dt.getHours() + CET_OFFSET)
    return { date: dt.toISOString().slice(0, 10), time: dt.toISOString().slice(11, 16) }
  } catch { return { date: dateStr, time: '18:00' } }
}

async function edgeFetch(endpoint = '/get/games') {
  try {
    const url = `${EDGE_URL}?endpoint=${encodeURIComponent(endpoint)}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'Authorization': `Bearer ${EDGE_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`Edge HTTP ${res.status}`)
    const json = await res.json()
    console.log('[API] Raw response keys:', Object.keys(json))
    return { data: json, ok: true }
  } catch (e) {
    console.warn('[API] edgeFetch failed:', e.message)
    return { data: null, ok: false }
  }
}

// Extract matches array from any API response shape
function extractMatches(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  // Try every possible key
  const keys = ['games','matches','data','results','fixtures','events','items']
  for (const k of keys) {
    if (Array.isArray(data[k]) && data[k].length > 0) {
      console.log(`[API] Found matches under key: "${k}" (${data[k].length} items)`)
      return data[k]
    }
  }
  // If object with numeric keys
  const vals = Object.values(data)
  if (vals.length > 0 && typeof vals[0] === 'object') {
    console.log('[API] Using Object.values fallback:', vals.length, 'items')
    return vals
  }
  console.warn('[API] Could not extract matches from response:', JSON.stringify(data).slice(0, 200))
  return []
}

function parseMatch(m) {
  if (!m || typeof m !== 'object') return null

  const rawDate = m.date || m.match_date || m.matchDate || m.Date || ''
  const rawTime = m.time || m.match_time || m.matchTime || m.Time || m.kickoff || '00:00'
  const { date, time } = toCET(rawDate, rawTime)

  if (!date) return null

  const raw = (m.status || m.Status || m.state || '').toLowerCase()
  const status =
    raw.includes('live') || raw.includes('progress') || raw.includes('cours') ? 'live'
    : raw.includes('finish') || raw.includes('ft') || raw.includes('complet') || raw.includes('terminé') ? 'finished'
    : 'upcoming'

  // Team name extraction — handle nested objects
  const homeName =
    (typeof m.home_team === 'object' ? m.home_team?.name || m.home_team?.Name : null) ||
    m.home_team || m.homeTeam || m.home || m.Home || m.team_home || ''

  const awayName =
    (typeof m.away_team === 'object' ? m.away_team?.name || m.away_team?.Name : null) ||
    m.away_team || m.awayTeam || m.away || m.Away || m.team_away || ''

  if (!homeName || !awayName) return null

  const homeFlag =
    (typeof m.home_team === 'object' ? m.home_team?.flag || m.home_team?.logo || m.home_team?.image : null) ||
    m.home_flag || m.homeflag || m.home_logo || ''

  const awayFlag =
    (typeof m.away_team === 'object' ? m.away_team?.flag || m.away_team?.logo || m.away_team?.image : null) ||
    m.away_flag || m.awayflag || m.away_logo || ''

  const homeScore =
    m.home_score ?? m.homeScore ?? m.score?.home ?? m.score_home ??
    (typeof m.score === 'string' ? parseInt(m.score.split('-')[0]) : null) ?? null

  const awayScore =
    m.away_score ?? m.awayScore ?? m.score?.away ?? m.score_away ??
    (typeof m.score === 'string' ? parseInt(m.score.split('-')[1]) : null) ?? null

  return {
    api_id:      String(m.id || m._id || m.Id || m.match_id || ''),
    home_team:   String(homeName),
    away_team:   String(awayName),
    home_flag:   String(homeFlag),
    away_flag:   String(awayFlag),
    home_score:  homeScore !== null && !isNaN(Number(homeScore)) ? Number(homeScore) : null,
    away_score:  awayScore !== null && !isNaN(Number(awayScore)) ? Number(awayScore) : null,
    match_date:  date,
    match_time:  time + ':00',
    group_stage: m.group || m.Group || m.round || m.Round || m.stage || m.Stage || m.group_stage || '',
    stadium:     (typeof m.stadium === 'object' ? m.stadium?.name : m.stadium) || m.venue || m.ground || '',
    city:        (typeof m.stadium === 'object' ? m.stadium?.city : null) || m.city || m.City || '',
    status,
    matchday:    Number(m.matchday || m.round_number || m.week || 1) || 1,
  }
}

// ── Bootstrap — first load when DB is empty ──────────────────

export async function bootstrapFromAPI() {
  console.log('[Bootstrap] DB vide — import depuis API...')
  const { data, ok } = await edgeFetch('/get/games')

  if (!ok || !data) {
    console.warn('[Bootstrap] API indisponible — nouvelle tentative au prochain sync')
    return { ok: false, count: 0 }
  }

  const arr = extractMatches(data)

  if (arr.length === 0) {
    console.warn('[Bootstrap] 0 matchs extraits — vérifiez la structure API')
    return { ok: true, count: 0 }
  }

  const rows = arr.map(parseMatch).filter(Boolean).filter(m => m.home_team && m.away_team && m.match_date)
  console.log(`[Bootstrap] ${rows.length} matchs valides à insérer`)

  if (rows.length === 0) return { ok: true, count: 0 }

  let inserted = 0
  const BATCH = 20
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from('matches')
      .upsert(rows.slice(i, i + BATCH), { onConflict: 'api_id', ignoreDuplicates: false })
    if (error) console.error('[Bootstrap] Erreur batch:', error.message)
    else inserted += Math.min(BATCH, rows.length - i)
  }

  console.log(`[Bootstrap] ✅ ${inserted} matchs importés`)
  return { ok: true, count: inserted }
}

// ── DB reads ──────────────────────────────────────────────────

export async function loadMatchesFromDB() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
  if (error) console.error('[DB] loadMatches:', error.message)
  return data || []
}

// ── Sync — toutes les 60s ─────────────────────────────────────

export async function syncFromAPI() {
  const { data, ok } = await edgeFetch('/get/games')
  if (!ok || !data) return { ok: false, updated: 0 }

  const arr = extractMatches(data)
  if (!arr.length) return { ok: true, updated: 0 }

  const { data: dbRows } = await supabase
    .from('matches')
    .select('id, api_id, home_score, away_score, status, admin_override')

  const dbMap = {}
  for (const m of (dbRows || [])) if (m.api_id) dbMap[m.api_id] = m

  const toUpsert = []
  for (const raw of arr) {
    const m = parseMatch(raw)
    if (!m || !m.api_id || !m.home_team) continue

    const existing = dbMap[m.api_id]
    if (!existing) {
      toUpsert.push(m) // nouveau match (knockout)
    } else {
      if (existing.admin_override) continue
      const changed = existing.home_score !== m.home_score ||
                      existing.away_score !== m.away_score ||
                      existing.status !== m.status
      if (changed) toUpsert.push({ id: existing.id, api_id: m.api_id, home_score: m.home_score, away_score: m.away_score, status: m.status })
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase.from('matches').upsert(toUpsert, { onConflict: 'api_id' })
    if (error) console.error('[Sync] Erreur:', error.message)
  }

  return { ok: true, updated: toUpsert.length }
}
