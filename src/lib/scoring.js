/**
 * SCORING RULES — GoalGenius Final
 *
 * Score prediction: always based on 90-minute score (never penalties)
 * Winner prediction: based on final winner (after penalties if knockout)
 *
 * 10 pts — Correct winner + exact 90-min score
 *  5 pts — Correct winner only
 *  3 pts — Wrong winner + at least one score exact
 *  0 pts — Everything wrong
 */
export function calcPoints(pred, result) {
  if (result.home_score == null || result.away_score == null) return null

  const ph = Number(pred.home_score)
  const pa = Number(pred.away_score)
  const rh = Number(result.home_score)
  const ra = Number(result.away_score)

  // Real winner: use API winner field if present (knockout penalties),
  // otherwise derive from 90-min score
  const realWinner = result.winner || (rh > ra ? 'home' : rh < ra ? 'away' : 'draw')
  const predWinner = pred.winner_pick || (ph > pa ? 'home' : ph < pa ? 'away' : 'draw')

  const correctWinner  = predWinner === realWinner
  const exactScore     = ph === rh && pa === ra
  const oneScoreMatch  = ph === rh || pa === ra

  if (correctWinner && exactScore)    return 10
  if (correctWinner)                  return 5
  if (!correctWinner && oneScoreMatch) return 3
  return 0
}

/**
 * Validate prediction inputs
 * Returns error message string or null if valid
 */
export function validatePrediction(homeScore, awayScore, winnerPick, isKnockout = false) {
  // Both scores required
  if (homeScore === null || homeScore === undefined || String(homeScore) === '')
    return 'Veuillez entrer le score de l\'équipe domicile'
  if (awayScore === null || awayScore === undefined || String(awayScore) === '')
    return 'Veuillez entrer le score de l\'équipe extérieure'

  // Winner required
  if (!winnerPick)
    return 'Veuillez choisir un vainqueur'

  // No draw in knockout matches
  if (isKnockout && winnerPick === 'draw')
    return '⚠️ Les matchs à élimination directe ne peuvent pas se terminer par un nul. Choisissez une équipe.'

  // Winner must be consistent with score
  const h = Number(homeScore), a = Number(awayScore)
  if (!isNaN(h) && !isNaN(a)) {
    const implied = h > a ? 'home' : h < a ? 'away' : 'draw'
    if (implied !== winnerPick) {
      const teams = { home: 'équipe domicile', away: 'équipe extérieure', draw: 'match nul' }
      return `⚠️ Votre score (${h}–${a}) indique une victoire de l'${teams[implied]}, mais vous avez choisi un vainqueur différent. Veuillez corriger votre pronostic pour qu'il soit cohérent.`
    }
  }

  return null
}

export const SCORING_RULES = [
  { pts: 10, emoji: '🏆', label: 'Vainqueur exact + score parfait', desc: 'Vous avez deviné le bon vainqueur ET le score exact (90 min)' },
  { pts: 5,  emoji: '⭐', label: 'Bon vainqueur',                   desc: 'Vous avez deviné le bon vainqueur (ou nul en phase de groupes)' },
  { pts: 3,  emoji: '👍', label: 'Mauvais vainqueur + un score juste', desc: 'Mauvais gagnant mais au moins un score exact' },
  { pts: 0,  emoji: '❌', label: 'Raté',                             desc: 'Ni le vainqueur ni les scores corrects' },
]
