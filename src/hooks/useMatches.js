import { useState, useEffect, useCallback, useRef } from 'react'
import { loadMatchesFromDB, loadStadiumsFromDB, syncFromAPI, bootstrapFromAPI } from '../lib/dataEngine'
const POLL_MS = 60_000
export function useMatches() {
  const [matches,   setMatches]   = useState([])
  const [stadiums,  setStadiums]  = useState({})
  const [loading,   setLoading]   = useState(true)
  const [apiStatus, setApiStatus] = useState('unknown')
  const [lastSync,  setLastSync]  = useState(null)
  const syncRef = useRef(false)
  const loadDB = useCallback(async () => {
    const [data, stMap] = await Promise.all([loadMatchesFromDB(), loadStadiumsFromDB()])
    setMatches(data)
    setStadiums(stMap)
    return data
  }, [])
  const sync = useCallback(async () => {
    if (syncRef.current) return
    syncRef.current = true
    try {
      const { ok, updated } = await syncFromAPI()
      setApiStatus(ok ? 'ok' : 'warn')
      setLastSync(new Date())
      if (ok && updated > 0) await loadDB()
    } catch { setApiStatus('error'); await loadDB() }
    finally { syncRef.current = false }
  }, [loadDB])
  const init = useCallback(async () => {
    const data = await loadDB()
    if (data.length === 0) {
      const { ok, count } = await bootstrapFromAPI()
      setApiStatus(ok ? 'ok' : 'warn')
      setLastSync(new Date())
      if (count > 0) await loadDB()
    } else {
      await sync()
    }
    setLoading(false)
  }, [loadDB, sync])
  useEffect(() => {
    init()
    const t = setInterval(sync, POLL_MS)
    return () => clearInterval(t)
  }, [init, sync])
  return { matches, stadiums, loading, apiStatus, lastSync, refresh: () => loadDB().then(() => sync()) }
}