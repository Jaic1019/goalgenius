import { useState, useEffect, useCallback, useRef } from 'react'
import { loadMatchesFromDB, syncFromAPI, bootstrapFromAPI } from '../lib/dataEngine'

const POLL_MS = 60_000

export function useMatches() {
  const [matches, setMatches]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [apiStatus, setApiStatus] = useState('unknown')
  const [lastSync, setLastSync]   = useState(null)
  const syncRef = useRef(false)

  const loadDB = useCallback(async () => {
    const data = await loadMatchesFromDB()
    setMatches(data)
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
    } catch { setApiStatus('error') }
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

  return { matches, loading, apiStatus, lastSync, refresh: () => loadDB().then(() => sync()) }
}
