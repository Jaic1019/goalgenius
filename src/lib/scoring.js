/**
 * GoalGenius scoring rules:
 * 10pts — exact score + correct winner
 *  7pts — correct winner + one team's goals exact
 *  6pts — correct winner + off by 1 on each team
 *  5pts — correct winner only
 *  5pts — exact goals both teams, wrong winner
 *  3pts — off by 1 total goals, wrong winner
 *  0pts — otherwise
 */
export function calcPoints(pred, result) {
  if (result.home_score === null || result.away_score === null) return null

  const { home_score: ph, away_score: pa } = pred
  const { home_score: rh, away_score: ra } = result

  const predWinner = ph > pa ? 'home' : ph < pa ? 'away' : 'draw'
  const realWinner = rh > ra ? 'home' : rh < ra ? 'away' : 'draw'
  const rightWinner = predWinner === realWinner

  if (ph === rh && pa === ra) return 10                                // exact + winner (always right winner if exact)
  if (rightWinner && (ph === rh || pa === ra)) return 7               // winner + one team exact
  if (rightWinner && Math.abs(ph - rh) <= 1 && Math.abs(pa - ra) <= 1) return 6  // winner + off by 1 each
  if (rightWinner) return 5                                            // winner only
  if (ph === rh && pa === ra) return 5                                 // exact goals, wrong winner (can't happen after line 1, safety)
  const predTotal = ph + pa
  const realTotal = rh + ra
  if (!rightWinner && Math.abs(predTotal - realTotal) <= 1) return 3  // close total, wrong winner
  return 0
}

export function getWinner(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home'
  if (homeScore < awayScore) return 'away'
  return 'draw'
}
