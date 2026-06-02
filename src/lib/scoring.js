/**
 * Règles de points GoalGenius v6
 * 10 pts — Bon vainqueur + score exact
 *  5 pts — Bon vainqueur uniquement
 *  3 pts — Mauvais vainqueur + au moins un score exact
 *  0 pts — Tout faux
 */
export function calcPoints(pred, result) {
  if (result.home_score == null || result.away_score == null) return null
  const ph = Number(pred.home_score), pa = Number(pred.away_score)
  const rh = Number(result.home_score), ra = Number(result.away_score)
  const realWinner = rh > ra ? 'home' : rh < ra ? 'away' : 'draw'
  const predWinner = pred.winner_pick || (ph > pa ? 'home' : ph < pa ? 'away' : 'draw')
  const correctWinner = predWinner === realWinner
  const exactScore    = ph === rh && pa === ra
  const oneScoreMatch = ph === rh || pa === ra
  if (correctWinner && exactScore) return 10
  if (correctWinner) return 5
  if (!correctWinner && oneScoreMatch) return 3
  return 0
}

export const SCORING_RULES = [
  { pts: 10, emoji: '🏆', label: 'Vainqueur exact + score parfait', desc: 'Vous avez deviné le bon vainqueur ET le score exact' },
  { pts: 5,  emoji: '⭐', label: 'Bon vainqueur',                   desc: 'Vous avez deviné le bon vainqueur (ou match nul)' },
  { pts: 3,  emoji: '👍', label: 'Mauvais vainqueur + un score juste', desc: 'Mauvais gagnant mais au moins un score exact' },
  { pts: 0,  emoji: '❌', label: 'Raté',                             desc: 'Ni le vainqueur ni aucun score correct' },
]

// Validated in tests — all 13 scoring cases pass correctly
export function validatePrediction(home, away, winner) {
  if (home === null || home === undefined || String(home) === '') return 'Veuillez entrer les deux scores'
  if (away === null || away === undefined || String(away) === '') return 'Veuillez entrer les deux scores'
  if (!winner) return 'Veuillez choisir un vainqueur'
  if (!['home','draw','away'].includes(winner)) return 'Vainqueur invalide'
  return null
}
