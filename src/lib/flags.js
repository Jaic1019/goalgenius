// Flag resolver — converts ISO codes to emoji flags
const _SF = {
  SCO: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F',
  ENG: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
  WAL: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73\uDB40\uDC7F',
  NIR: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F',
}

export function resolveFlag(url) {
  if (!url || url === '\uD83C\uDFF3\uFE0F') return null
  if (_SF[url.toUpperCase()]) return _SF[url.toUpperCase()]
  if (url.length > 2 && !url.startsWith('http')) return url
  if (url.length === 2) {
    try { return url.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1F1E6)).join('') }
    catch { return null }
  }
  if (url.startsWith('http')) return url
  return null
}
