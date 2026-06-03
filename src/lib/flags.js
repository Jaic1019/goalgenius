/**
 * FLAG RESOLVER — GoalGenius Final
 * Handles all flag formats from the API:
 * - "MX"  → 🇲🇽  (2-letter ISO code — confirmed from DB)
 * - "SCO" → 🏴󠁧󠁢󠁳󠁣󠁴󠁿  (special home nations)
 * - "🇫🇷" → 🇫🇷  (already emoji)
 * - "https://..." → image URL
 * - null/empty → null (show letter fallback)
 */

const SPECIAL = {
  'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'WAL': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'NIR': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
}

function isoToEmoji(code) {
  try {
    return code.toUpperCase().split('').map(c =>
      String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1F1E6)
    ).join('')
  } catch { return null }
}

export function resolveFlag(url) {
  if (!url || url === '🏳️') return null

  // Special 3-letter codes (home nations) — check first
  const upper = typeof url === 'string' ? url.toUpperCase() : ''
  if (SPECIAL[upper]) return SPECIAL[upper]

  // Already an emoji flag (not URL, not file path, longer than 2 chars)
  if (typeof url === 'string' &&
      !url.startsWith('http') &&
      !url.includes('.') &&
      !url.includes('/') &&
      url.length > 2) {
    return url
  }

  // 2-letter ISO code → emoji (confirmed API format: MX, ZA, KR etc.)
  if (/^[a-zA-Z]{2}$/.test(url)) {
    return isoToEmoji(url)
  }

  // Image URL → use as-is
  if (url.startsWith('http')) return url

  return null
}
