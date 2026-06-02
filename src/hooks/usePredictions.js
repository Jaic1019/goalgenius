import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function usePredictions() {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState({}) // keyed by match_id
  const [saving, setSaving] = useState({})

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('predictions').select('*').eq('user_id', user.id)
    const map = {}
    for (const p of (data || [])) map[p.match_id] = p
    setPredictions(map)
  }, [user])

  useEffect(() => { load() }, [load])

  async function save(matchId, homeScore, awayScore) {
    if (!user) return false
    setSaving(s => ({ ...s, [matchId]: true }))
    const { error } = await supabase.from('predictions').upsert(
      { user_id: user.id, match_id: matchId, home_score: Number(homeScore), away_score: Number(awayScore) },
      { onConflict: 'user_id,match_id' }
    )
    if (!error) setPredictions(p => ({ ...p, [matchId]: { home_score: Number(homeScore), away_score: Number(awayScore) } }))
    setSaving(s => ({ ...s, [matchId]: false }))
    return !error
  }

  return { predictions, saving, save, reload: load }
}

export async function loadAllPredictions() {
  const { data } = await supabase
    .from('predictions')
    .select('*, profile:profiles(full_name, role)')
  return data || []
}
