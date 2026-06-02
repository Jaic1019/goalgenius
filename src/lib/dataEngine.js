/**
 * HYBRID DATA ENGINE — GoalGenius Final
 *
 * API calls go through Supabase Edge Function (no CORS issues)
 * DB is source of truth — API only updates scores/status
 */

import { supabase } from './supabase'

const CET_OFFSET = 2 // CEST during World Cup (UTC+2)

// Edge Function URL — proxies worldcup26.ir to avoid CORS
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-matches`
const EDGE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Helpers ──────────────────────────────────────────────────

function toCET(dateStr, timeStr) {
  if (!dateStr) return { date: dateStr, time: timeStr }
  try {
    const dt = new Date(`${dateStr}T${(timeStr || '00:00').slice(0, 5)}:00Z`)
    dt.setHours(dt.getHours() + CET_OFFSET)
    return {
      date: dt.toISOString().slice(0, 10),
      time: dt.toISOString().slice(11, 16),
    }
  } catch { return { date: dateStr, time: timeStr } }
}

async function edgeFetch(endpoint = '/get/games') {
  try {
    const res = await fetch(`${EDGE_URL}?endpoint=${encodeURIComponent(endpoint)}`, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'Authorization': `Bearer ${EDGE_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`Edge error ${res.status}`)
    return { data: await res.json(), ok: true }
  } catch (e) {
    console.warn(`[API] ${endpoint} failed:`, e.message)
    return { data: null, ok: false }
  }
}

function parseApiMatch(m) {
  const rawDate = m.date || m.match_date || ''
  const rawTime = m.time || m.match_time || '00:00'
  const { date, time } = toCET(rawDate, rawTime)

  const raw = (m.status || '').toLowerCase()
  const status =
    raw.includes('live') || raw.includes('progress') ? 'live'
    : raw.includes('finish') || raw.includes('ft') || raw.includes('complete') ? 'finished'
    : 'upcoming'

  const homeName = m.home_team?.name || m.homeTeam?.name || m.homeTeam || m.home || ''
  const awayName = m.away_team?.name || m.awayTeam?.name || m.awayTeam || m.away || ''
  const homeFlag = m.home_team?.flag || m.home_team?.logo || m.homeflag || ''
  const awayFlag = m.away_team?.flag || m.away_team?.logo || m.awayflag || ''

  return {
    api_id:      String(m.id || m._id || ''),
    home_team:   homeName,
    away_team:   awayName,
    home_flag:   homeFlag,
    away_flag:   awayFlag,
    home_score:  m.home_score ?? m.homeScore ?? m.score?.home ?? null,
    away_score:  m.away_score ?? m.awayScore ?? m.score?.away ?? null,
    match_date:  date,
    match_time:  time + ':00',
    group_stage: m.group || m.round || m.stage || m.group_stage || '',
    stadium:     m.stadium?.name || m.venue || m.ground || '',
    city:        m.stadium?.city || m.city || '',
    status,
    matchday:    m.matchday || m.round_number || 1,
  }
}

// ── Bootstrap — runs once when DB is empty ───────────────────

export async function bootstrapFromAPI() {
  console.log('[Bootstrap] DB empty — importing all matches from API…')
  const { data: apiData, ok } = await edgeFetch('/get/games')

  if (!ok || !apiData) {
    console.warn('[Bootstrap] API unavailable — will retry on next sync')
    return { ok: false, count: 0 }
  }

  const arr = Array.isArray(apiData)
    ? apiData
    : apiData.games || apiData.matches || apiData.data || []

  if (!arr.length) {
    console.warn('[Bootstrap] API returned 0 matches')
    return { ok: true, count: 0 }
  }

  const rows = arr
    .map(parseApiMatch)
    .filter(m => m.home_team && m.away_team && m.match_date)

  // Insert in batches of 20
  let inserted = 0
  const BATCH = 20
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase
      .from('matches')
      .upsert(batch, { onConflict: 'api_id', ignoreDuplicates: false })
    if (error) console.error('[Bootstrap] batch error:', error.message)
    else inserted += batch.length
  }

  console.log(`[Bootstrap] ✅ Imported ${inserted} matches`)
  return { ok: true, count: inserted }
}

// ── DB reads ─────────────────────────────────────────────────

export async function loadMatchesFromDB() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true })
    .order('match_time', { ascending: true })
  if (error) console.error('[DB] loadMatches:', error.message)
  return data || []
}

// ── Sync — every 60s — only updates what changed ─────────────

export async function syncFromAPI() {
  const { data: apiData, ok } = await edgeFetch('/get/games')
  if (!ok || !apiData) return { ok: false, updated: 0 }

  const arr = Array.isArray(apiData)
    ? apiData
    : apiData.games || apiData.matches || apiData.data || []
  if (!arr.length) return { ok: true, updated: 0 }

  const { data: dbRows } = await supabase
    .from('matches')
    .select('id, api_id, home_score, away_score, status, admin_override')

  const dbMap = {}
  for (const m of (dbRows || [])) dbMap[m.api_id] = m

  const toUpsert = []

  for (const raw of arr) {
    const m = parseApiMatch(raw)
    if (!m.api_id || !m.home_team) continue

    const existing = dbMap[m.api_id]

    if (!existing) {
      // New match (knockout fixture)
      toUpsert.push(m)
    } else {
      if (existing.admin_override) continue
      const scoreChanged  = existing.home_score !== m.home_score || existing.away_score !== m.away_score
      const statusChanged = existing.status !== m.status
      if (scoreChanged || statusChanged) {
        toUpsert.push({
          id:         existing.id,
          api_id:     m.api_id,
          home_score: m.home_score,
          away_score: m.away_score,
          status:     m.status,
        })
      }
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from('matches')
      .upsert(toUpsert, { onConflict: 'api_id' })
    if (error) console.error('[Sync] error:', error.message)
  }

  return { ok: true, updated: toUpsert.length }
}
