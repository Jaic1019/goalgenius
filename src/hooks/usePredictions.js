import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { validatePrediction } from '../lib/scoring'

export function usePredictions() {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState({})
  const [saving, setSaving] = useState({})

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('predictions').select('*').eq('user_id', user.id)
    const map = {}
    for (const p of (data || [])) map[p.match_id] = p
    setPredictions(map)
  }, [user])

  useEffect(() => { load() }, [load])

  async function save(matchId, homeScore, awayScore, winnerPick, isKnockout = false) {
    if (!user) return { ok: false, error: 'Non connecté' }

    // Full validation including consistency check
    const validationError = validatePrediction(homeScore, awayScore, winnerPick, isKnockout)
    if (validationError) return { ok: false, error: validationError }

    const isUpdate = !!predictions[matchId]
    setSaving(s => ({ ...s, [matchId]: true }))

    const { error } = await supabase.from('predictions').upsert(
      {
        user_id:     user.id,
        match_id:    matchId,
        home_score:  Number(homeScore),
        away_score:  Number(awayScore),
        winner_pick: winnerPick,
      },
      { onConflict: 'user_id,match_id' }
    )

    if (!error) {
      setPredictions(p => ({
        ...p,
        [matchId]: { home_score: Number(homeScore), away_score: Number(awayScore), winner_pick: winnerPick }
      }))
    }

    setSaving(s => ({ ...s, [matchId]: false }))
    return { ok: !error, error: error?.message, isUpdate }
  }

  return { predictions, saving, save, reload: load }
}
