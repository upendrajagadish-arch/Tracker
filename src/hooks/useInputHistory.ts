import { useState, useCallback } from 'react'

export function addHistoryToStorage(platform: string, val: string) {
  if (!val.trim()) return
  const key = `history-${platform}`
  const saved = localStorage.getItem(key)
  let history: string[] = []
  if (saved) {
    try {
      history = JSON.parse(saved)
    } catch {
      // ignore
    }
  }
  const newHistory = [val.trim(), ...history.filter(h => h !== val.trim())].slice(0, 10)
  localStorage.setItem(key, JSON.stringify(newHistory))
}

export function useInputHistory(platform: string) {
  const key = `history-${platform}`
  
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return []
      }
    }
    return []
  })

  // We still listen to cross-tab changes if we wanted to, but for now we just provide an update function
  const addHistory = useCallback((val: string) => {
    addHistoryToStorage(platform, val)
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch {
        // ignore
      }
    }
  }, [platform, key])

  const removeHistory = useCallback((val: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(h => h !== val)
      localStorage.setItem(key, JSON.stringify(newHistory))
      return newHistory
    })
  }, [key])

  return { history, addHistory, removeHistory }
}

