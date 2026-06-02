/**
 * Free World Cup 2026 API — no key required
 * https://github.com/rezarahiminia/worldcup2026
 */
const BASE = 'https://worldcup2026api.com/api'

// Fallback static data if API is unreachable
export async function fetchLiveMatches() {
  try {
    const res = await fetch(`${BASE}/matches?status=live`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error('API error')
    return await res.json()
  } catch {
    return []
  }
}

export async function fetchMatchByTeams(home, away) {
  try {
    const res = await fetch(`${BASE}/matches`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error()
    const data = await res.json()
    return data.find(m =>
      (m.home_team?.toLowerCase().includes(home.toLowerCase()) ||
       home.toLowerCase().includes(m.home_team?.toLowerCase())) &&
      (m.away_team?.toLowerCase().includes(away.toLowerCase()) ||
       away.toLowerCase().includes(m.away_team?.toLowerCase()))
    ) || null
  } catch {
    return null
  }
}

export async function fetchStandings() {
  try {
    const res = await fetch(`${BASE}/groups`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error()
    return await res.json()
  } catch {
    return []
  }
}
