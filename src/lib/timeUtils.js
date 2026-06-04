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
 * Strategy: use the fact that Date.parse interprets ISO strings without
 * timezone as LOCAL time in the browser — we work around this by using
 * Intl to find the UTC offset for the stadium timezone at that exact moment.
 *
 * Verified: Mexico 13:00 CDT → 20:00 CEST, NY 15:00 EDT → 21:00 CEST
 */
export function toParisTime(localDateRaw, timezone, fallbackDate, fallbackTime) {
  if (!localDateRaw) {
    if (fallbackDate && fallbackTime) {
      const t = fallbackTime.slice(0, 5)
      const d = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'long'
      }).format(new Date(fallbackDate + 'T' + t + ':00Z'))
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

    // Step 1: Build a UTC date assuming local time IS UTC (wrong timezone, but gives us a reference point)
    const fakeUtc = new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0
    ))

    // Step 2: Find what this "fake UTC" time looks like in the stadium timezone
    // This tells us what the UTC offset is for that timezone at that date/time
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year:   'numeric',
      month:  '2-digit',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = {}
    formatter.formatToParts(fakeUtc).forEach(({ type, value }) => parts[type] = value)

    // Step 3: Build the "displayed local time" as UTC to find the offset
    const displayedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) % 24, // handle 24:00 edge case
      Number(parts.minute),
      Number(parts.second)
    )

    // Step 4: The offset in ms between what we fed in and what the timezone showed
    const offsetMs = fakeUtc.getTime() - displayedAsUtc

    // Step 5: True UTC = local stadium time + offset
    const trueUtc = new Date(fakeUtc.getTime() + offsetMs)

    // Step 6: Display in Europe/Paris
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
 * Blocked when: not upcoming, home_team null, away_team null
 */
export function isPredictionOpen(match, stadiumsMap = {}) {
  if (match.status !== 'upcoming') return false
  // Block if teams not confirmed yet (null = knockout TBD)
  if (!match.home_team || !match.away_team) return false

  try {
    const stadium = stadiumsMap[match.stadium_id]
    const tz      = stadium?.timezone || 'America/New_York'

    if (match.local_date_raw) {
      const { time } = toParisTime(match.local_date_raw, tz)
      if (time === '—') return false
      // Compare Paris time of kick-off with now
      return new Date() < new Date(`${match.match_date}T${time}:00`)
    }
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
