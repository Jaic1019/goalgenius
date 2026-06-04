/**
 * FLAG RESOLVER — GoalGenius
 * Handles all flag formats: emoji (stored in DB), ISO codes, URLs
 */

const SPECIAL = {
  SCO: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F',
  ENG: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
  WAL: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73\uDB40\uDC7F',
  NIR: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
}

export function resolveFlag(url) {
  if (!url) return null
  // Special 3-letter codes
  if (SPECIAL[url.toUpperCase()]) return SPECIAL[url.toUpperCase()]
  // Already emoji (length > 2, not URL)
  if (url.length > 2 && !url.startsWith('http')) return url
  // 2-letter ISO code → emoji
  if (url.length === 2) {
    try { return url.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1F1E6)).join('') }
    catch { return null }
  }
  // URL
  if (url.startsWith('http')) return url
  return null
}
