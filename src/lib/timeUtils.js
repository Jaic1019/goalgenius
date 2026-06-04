/**
 * TIME UTILITIES — GoalGenius Final
 *
 * Converts API local_date_raw + stadium timezone → CEST (Europe/Paris)
 * Uses native browser Intl — DST-aware, zero hardcoded offsets
 */

/**
 * Convert API local_date_raw (MM/DD/YYYY HH:MM) + IANA timezone string
 * to display date/time in Europe/Paris (CEST in summer)
 *
 * @param {string} localDateRaw  - e.g. "06/11/2026 13:00"
 * @param {string} timezone      - IANA e.g. "America/New_York" (from stadiums table)
 * @param {string} fallbackDate  - match_date from DB if localDateRaw is null
 * @param {string} fallbackTime  - match_time from DB if localDateRaw is null
 * @returns {{ date: string, time: string, full: string }}
 */
export function toParisTime(localDateRaw, timezone, fallbackDate, fallbackTime) {
  // Fallback: no local_date_raw — use DB match_date + match_time directly
  if (!localDateRaw) {
    if (fallbackDate && fallbackTime) {
      const t = fallbackTime.slice(0, 5)
      const d = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'long'
      }).format(new Date(fallbackDate + 'T' + t + ':00'))
      return { date: d, time: t, full: `${d} · ${t} CEST` }
    }
    return { date: '—', time: '—', full: '—' }
  }

  try {
    // Parse "MM/DD/YYYY HH:MM"
    const [datePart, timePart] = localDateRaw.split(' ')
    const [month, day, year]   = datePart.split('/')
    const [hour, minute]       = (timePart || '00:00').split(':')

    const tz = timezone || 'America/New_York'

    // Build ISO string treating it as UTC first (probe)
    const isoString = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${hour.padStart(2,'0')}:${minute.padStart(2,'0')}:00`
    const probe = new Date(isoString + 'Z')

    // Find what the UTC probe looks like in stadium local timezone
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(probe)

    const p = {}
    parts.forEach(({ type, value }) => p[type] = value)

    // Calculate offset: difference between UTC probe and what it displays in stadium tz
    const localDisplayed = new Date(`${p.year}-${p.month}-${p.day}T${p.hour === '24' ? '00' : p.hour}:${p.minute}:00Z`)
    const offsetMs = probe.getTime() - localDisplayed.getTime()

    // Apply offset to get true UTC from local stadium time
    const trueUtc = new Date(probe.getTime() + offsetMs)

    // Display in Europe/Paris
    const dateDisplay = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      weekday: 'short', day: 'numeric', month: 'long'
    }).format(trueUtc)

    const timeDisplay = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(trueUtc)

    const timeClean = timeDisplay.replace('h', ':').replace(/^(\d):/, '0$1:')

    return {
      date: dateDisplay,
      time: timeClean,
      full: `${dateDisplay} · ${timeClean} CEST`
    }
  } catch(e) {
    console.warn('[timeUtils]', e.message)
    return { date: '—', time: '—', full: '—' }
  }
}

/**
 * Check if prediction is still open
 * Uses local_date_raw + timezone → convert to UTC → compare with now
 */
export function isPredictionOpen(match, stadiumsMap = {}) {
  if (match.status !== 'upcoming') return false
  if (!match.home_team || !match.away_team) return false
  const home = match.home_team.trim().toUpperCase()
  const away = match.away_team.trim().toUpperCase()
  if (home === 'TBD' || away === 'TBD') return false
  // Also block if it's a knockout label like "Winner Match 74"
  if (home.startsWith('WINNER') || home.startsWith('LOSER') ||
      away.startsWith('WINNER') || away.startsWith('LOSER')) return false

  try {
    const stadium = stadiumsMap[match.stadium_id]
    const tz = stadium?.timezone || 'America/New_York'

    if (match.local_date_raw) {
      const { time } = toParisTime(match.local_date_raw, tz)
      if (time === '—') return false
      return new Date() < new Date(`${match.match_date}T${time}:00`)
    }
    // Fallback
    if (match.match_date && match.match_time) {
      return new Date() < new Date(`${match.match_date}T${match.match_time.slice(0,5)}:00`)
    }
    return false
  } catch { return false }
}

/**
 * Check if match is a knockout stage match
 */
export function isKnockoutMatch(g) {
  if (!g) return false
  const s = g.toLowerCase()
  return (
    s.includes('16e') || s.includes('huitième') || s.includes('quart') ||
    s.includes('demi') || s.includes('semi') || s.includes('final') ||
    s.includes('finale') || s.includes('3ème') || s.includes('place') ||
    s.includes('r32') || s.includes('r16') || s.includes('qf') || s.includes('sf')
  )
}

/**
 * Get stadium display name from stadiums map
 */
export function getStadiumName(stadiumId, stadiumsMap = {}) {
  const s = stadiumsMap[Number(stadiumId)]
  return s ? `${s.name} · ${s.city}` : null
}
