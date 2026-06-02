export function calcPoints(pred, result) {
  if (result.home_score == null || result.away_score == null) return null
  const ph = Number(pred.home_score), pa = Number(pred.away_score)
  const rh = Number(result.home_score), ra = Number(result.away_score)
  const hEx = ph === rh, aEx = pa === ra
  const hCl = Math.abs(ph - rh) === 1, aCl = Math.abs(pa - ra) === 1
  if (hEx && aEx) return 10
  if ((hEx && aCl) || (aEx && hCl)) return 7
  if (hEx || aEx) return 5
  if (hCl && aCl) return 3
  return 0
}

export const SCORING_RULES = [
  { pts: 10, label: 'Perfect score',         desc: 'Both scores exact — e.g. 2-1 → 2-1' },
  { pts: 7,  label: 'One exact + one close',  desc: 'One exact, other within ±1 — e.g. 2-1 → 2-2' },
  { pts: 5,  label: 'One score exact',        desc: 'One score exact only — e.g. 2-1 → 2-3' },
  { pts: 3,  label: 'Both close',             desc: 'Both within ±1, none exact — e.g. 2-1 → 1-2' },
  { pts: 0,  label: 'Miss',                   desc: 'Neither score correct or close' },
]
