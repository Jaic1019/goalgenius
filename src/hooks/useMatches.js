import { useState, useEffect, useCallback, useRef } from 'react'
import { loadMatchesFromDB, syncFromAPI, bootstrapFromAPI } from '../lib/dataEngine'

const POLL_MS = 60_000 // sync every 60s

export function useMatches() {
  const [matches, setMatches]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [apiStatus, setApiStatus] = useState('unknown') // ok | warn | error | unknown
  const [lastSync, setLastSync]   = useState(null)
  const [bootstrapped, setBootstrapped] = useState(false)
  const syncRef = useRef(false)

  // Step 1 — load from DB immediately
  const loadDB = useCallback(async () => {
    const data = await loadMatchesFromDB()
    setMatches(data)
    return data
  }, [])

  // Step 2 — if DB empty, bootstrap from API; else just sync
  const initData = useCallback(async () => {
    const data = await loadDB()

    if (data.length === 0) {
      // First run — import everything from API
      console.log('[useMatches] DB empty, bootstrapping from API…')
      const { ok, count } = await bootstrapFromAPI()
      setApiStatus(ok ? 'ok' : 'warn')
      setLastSync(new Date())
      setBootstrapped(true)
      if (ok && count > 0) {
        await loadDB() // reload DB with newly imported matches
      }
    } else {
      // DB has data — just do a normal sync
      await syncData()
    }

    setLoading(false)
  }, [loadDB])

  // Step 3 — background sync (score/status updates only)
  const syncData = useCallback(async () => {
    if (syncRef.current) return
    syncRef.current = true
    try {
      const { ok, updated } = await syncFromAPI()
      setApiStatus(ok ? 'ok' : 'warn')
      setLastSync(new Date())
      if (ok && updated > 0) {
        await loadDB() // refresh display if anything changed
      }
    } catch {
      setApiStatus('error')
    } finally {
      syncRef.current = false
    }
  }, [loadDB])

  useEffect(() => {
    initData()
    const interval = setInterval(syncData, POLL_MS)
    return () => clearInterval(interval)
  }, [initData, syncData])

  return {
    matches,
    loading,
    apiStatus,
    lastSync,
    bootstrapped,
    refresh: () => loadDB().then(() => syncData()),
  }
}
