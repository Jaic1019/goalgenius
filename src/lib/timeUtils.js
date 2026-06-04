/**
 * TIME UTILITIES — GoalGenius
 * 
 * IANA → UTC → Intl
 * Convert API local_date_raw + stadium_id → CEST in browser
 * Never converts on server. Never hardcodes offsets.
 */

// Stadium ID → IANA timezone (from API /get/stadiums)
export const STADIUM_TZ = {
  1:  'America/Mexico_City',   // Estadio Azteca, Mexico City
  2:  'America/Los_Angeles',   // Rose Bowl, Los Angeles
  3:  'America/Chicago',       // AT&T Stadium, Dallas
  4:  'America/Chicago',       // Arrowhead Stadium, Kansas City
  5:  'America/Chicago',       // NRG Stadium, Houston
  6:  'America/New_York',      // MetLife Stadium, New York
  7:  'America/New_York',      // Lincoln Financial Field, Philadelphia
  8:  'America/New_York',      // Gillette Stadium, Boston
  9:  'America/New_York',      // Hard Rock Stadium, Miami
  10: 'America/Los_Angeles',   // SoFi Stadium, Los Angeles
  11: 'America/New_York',      // MetLife Stadium, New York/NJ
  12: 'America/Chicago',       // Estadio BBVA, Monterrey
  13: 'America/Chicago',       // Estadio Akron, Guadalajara
  14: 'America/Vancouver',     // BC Place, Vancouver
  15: 'America/Toronto',       // BMO Field, Toronto
  16: 'America/Los_Angeles',   // SoFi Stadium, Los Angeles
}

// Stadium ID → Display name
export const STADIUM_NAMES = {
  1:  'Estadio Azteca · Mexico City',
  2:  'Rose Bowl · Los Angeles',
  3:  'AT&T Stadium · Dallas',
  4:  'Arrowhead Stadium · Kansas City',
  5:  'NRG Stadium · Houston',
  6:  'MetLife Stadium · New York',
  7:  'Lincoln Financial Field · Philadelphia',
  8:  'Gillette Stadium · Boston',
  9:  'Hard Rock Stadium · Miami',
  10: 'SoFi Stadium · Los Angeles',
  11: 'MetLife Stadium · New York',
  12: 'Estadio BBVA · Monterrey',
  13: 'Estadio Akron · Guadalajara',
  14: 'BC Place · Vancouver',
  15: 'BMO Field · Toronto',
  16: 'SoFi Stadium · Los Angeles',
}

/**
 * Convert API local_date_raw (MM/DD/YYYY HH:MM) + stadium_id
 * to display date/time in Europe/Paris (CEST in summer)
 * 
 * Uses IANA → UTC → Intl — fully browser-native, DST-aware
 * Returns { date: 'dim. 15 juin', time: '04:00', full: 'dim. 15 juin · 04:00 CEST' }
 */
export function toParisTime(localDateRaw, stadiumId) {
  if (!localDateRaw) return { date: '—', time: '—', full: '—' }
  
  try {
    // Parse "MM/DD/YYYY HH:MM"
    const [datePart, timePart] = localDateRaw.split(' ')
    const [month, day, year] = datePart.split('/')
    const [hour, minute] = (timePart || '00:00').split(':')
    
    const tz = STADIUM_TZ[Number(stadiumId)] || 'America/New_York'
    
    // Step 1: Build a date string treated as local stadium time
    // We use a trick: format a known UTC date in the target timezone,
    // find the offset, then apply it to our local time
    const isoString = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${hour.padStart(2,'0')}:${minute.padStart(2,'0')}:00`
    
    // Step 2: Find UTC offset for this timezone at this exact moment
    // by comparing what a UTC date looks like in local timezone
    const probe = new Date(isoString + 'Z') // treat as UTC first
    
    // Get what this UTC time looks like in stadium timezone
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(probe)
    
    const p = {}
    parts.forEach(({ type, value }) => p[type] = value)
    
    // Step 3: Calculate offset between UTC probe and local timezone display
    const localDisplayed = new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`)
    const offsetMs = probe.getTime() - localDisplayed.getTime()
    
    // Step 4: Apply offset to get true UTC from local stadium time
    const localDate = new Date(isoString + 'Z') // our local time as if UTC
    const trueUtc = new Date(localDate.getTime() + offsetMs)
    
    // Step 5: Display in Europe/Paris
    const dateDisplay = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      weekday: 'short', day: 'numeric', month: 'long'
    }).format(trueUtc)
    
    const timeDisplay = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(trueUtc)
    
    return {
      date: dateDisplay,
      time: timeDisplay.replace('h', ':').padEnd(5, '0'),
      full: `${dateDisplay} · ${timeDisplay.replace('h', ':')} CEST`
    }
  } catch(e) {
    console.warn('[timeUtils]', e.message)
    return { date: '—', time: '—', full: '—' }
  }
}

/**
 * Get stadium display name from stadium_id
 */
export function getStadiumName(stadiumId) {
  return STADIUM_NAMES[Number(stadiumId)] || null
}

/**
 * Check if prediction is still open
 * Uses local_date_raw + stadium_id → convert to UTC → compare with now
 */
export function isPredictionOpen(match) {
  if (match.status !== 'upcoming') return false
  if (!match.home_team || !match.away_team) return false
  if (match.home_team.trim().toUpperCase() === 'TBD' || 
      match.away_team.trim().toUpperCase() === 'TBD') return false
  
  try {
    if (match.local_date_raw && match.stadium_id) {
      const { time } = toParisTime(match.local_date_raw, match.stadium_id)
      if (time === '—') return false
      // Already past if converted time is in the past
      // Use match_date + converted time for comparison
      const cestDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date())
      return new Date() < new Date(`${match.match_date}T${time}:00`)
    }
    // Fallback: use stored match_date + match_time
    return new Date() < new Date(`${match.match_date}T${match.match_time?.slice(0,5)}:00`)
  } catch { return false }
}
