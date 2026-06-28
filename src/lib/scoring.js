/**
 * SCORING — GoalGenius Final
 * Score prediction: 90-minute score only (never penalties)
 * Winner prediction: final winner (uses API winner field for KO penalties)
 *
 * 10pts — Correct winner + exact 90-min score
 *  5pts — Correct winner only
 *  3pts — Wrong winner + at least one score exact
 *  0pts — Everything wrong
 */
export function calcPoints(pred, result) {
  if (result.home_score == null || result.away_score == null) return null

  const ph = Number(pred.home_score)
  const pa = Number(pred.away_score)
  const rh = Number(result.home_score)
  const ra = Number(result.away_score)

  // Winner: score-based first, then penalties if scores equal, then draw (group only)
  const realWinner = rh > ra ? 'home'
    : ra > rh ? 'away'
    : (result.home_penalty != null && result.away_penalty != null)
      ? (result.home_penalty > result.away_penalty ? 'home' : 'away')
      : 'draw'
  const predWinner = pred.winner_pick || (ph > pa ? 'home' : ph < pa ? 'away' : 'draw')

  const correctWinner  = predWinner === realWinner
  const exactScore     = ph === rh && pa === ra
  const oneScoreMatch  = ph === rh || pa === ra

  if (correctWinner && exactScore)     return 10
  if (correctWinner)                   return 5
  if (!correctWinner && oneScoreMatch) return 3
  return 0
}

/**
 * Validate prediction — returns error key or null if valid
 */
export function validatePrediction(homeScore, awayScore, winnerPick, isKnockout = false) {
  if (homeScore === null || homeScore === undefined || String(homeScore) === '')
    return 'Veuillez entrer le score de l\'équipe domicile'
  if (awayScore === null || awayScore === undefined || String(awayScore) === '')
    return 'Veuillez entrer le score de l\'équipe extérieure'
  if (!winnerPick)
    return 'Veuillez choisir un vainqueur'
  if (!['home','draw','away'].includes(winnerPick))
    return 'Vainqueur invalide'
  if (isKnockout && winnerPick === 'draw')
    return '⚠️ Les matchs à élimination directe ne peuvent pas se terminer par un nul. Choisissez une équipe.'

  // Score/winner consistency check
  const h = Number(homeScore), a = Number(awayScore)
  if (!isNaN(h) && !isNaN(a)) {
    const implied = h > a ? 'home' : h < a ? 'away' : 'draw'
    if (implied !== winnerPick && !(isKnockout && implied === 'draw')) {
      const labels = { home: 'l\'équipe domicile', away: 'l\'équipe extérieure', draw: 'un match nul' }
      return `⚠️ Votre score (${h}–${a}) indique une victoire de ${labels[implied]}, mais vous avez choisi un vainqueur différent. Veuillez corriger votre pronostic pour qu'il soit cohérent.`
    }
  }
  return null
}

export const SCORING_RULES = [
  { pts: 10, emoji: '🏆', label: 'Vainqueur exact + score parfait', desc: 'Bon vainqueur ET score exact (90 minutes)' },
  { pts: 5,  emoji: '⭐', label: 'Bon vainqueur',                   desc: 'Bon vainqueur (ou nul en phase de groupes)' },
  { pts: 3,  emoji: '👍', label: 'Mauvais vainqueur + un score juste', desc: 'Mauvais gagnant mais au moins un score exact' },
  { pts: 0,  emoji: '❌', label: 'Raté',                             desc: 'Ni le vainqueur ni les scores corrects' },
]
