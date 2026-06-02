/**
 * GoalGenius — Règles de points v3
 *
 * 10 pts — Les deux scores exacts (2-1 → 2-1)
 *  7 pts — Un score exact + l'autre à ±1 but
 *  5 pts — Un seul score exact
 *  3 pts — Les deux scores à ±1 but (mais aucun exact)
 *  0 pts — Aucun pronostic ou raté
 */
export function calcPoints(pred, result) {
  if (result.home_score === null || result.away_score === null) return null

  const ph = Number(pred.home_score)
  const pa = Number(pred.away_score)
  const rh = Number(result.home_score)
  const ra = Number(result.away_score)

  const homeExact = ph === rh
  const awayExact = pa === ra
  const homeClose = Math.abs(ph - rh) === 1
  const awayClose = Math.abs(pa - ra) === 1

  if (homeExact && awayExact) return 10          // Score parfait
  if (homeExact && awayClose) return 7           // Domicile exact + extérieur proche
  if (awayExact && homeClose) return 7           // Extérieur exact + domicile proche
  if (homeExact || awayExact) return 5           // Un seul score exact
  if (homeClose && awayClose) return 3           // Les deux proches (±1)
  return 0
}

export const SCORING_RULES = [
  { pts: 10, label: 'Score parfait',               desc: 'Les deux scores exacts — ex: tu joues 2-1, résultat 2-1' },
  { pts: 7,  label: 'Un exact + un proche',         desc: 'Un score exact, l\'autre à ±1 but — ex: 2-1 vs 2-2' },
  { pts: 5,  label: 'Un score exact',               desc: 'Un seul score exact — ex: 2-1 vs 2-3' },
  { pts: 3,  label: 'Les deux proches',             desc: 'Les deux scores à ±1 but, aucun exact — ex: 2-1 vs 1-2' },
  { pts: 0,  label: 'Raté',                         desc: 'Aucun score correct ni proche' },
]
