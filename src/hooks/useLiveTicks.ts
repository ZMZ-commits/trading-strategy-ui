import { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../api/config'

export interface Tick {
  symbol: string
  price: number
  size: number
  timestamp: string
  source: string
  type: string
}

function wsBase(): string {
  // Production: VITE_API_BASE_URL is an https URL -> wss.
  if (API_BASE) return API_BASE.replace(/^http/, 'ws')
  // Local dev fallback: backend on :8000.
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.hostname}:8000`
}

/**
 * Opens a WebSocket to the backend live-tick fan-out and accumulates the most
 * recent ticks (rolling window). Only connects while `enabled` is true.
 */
export function useLiveTicks(ticker: string, enabled: boolean, max = 300) {
  const [ticks, setTicks] = useState<Tick[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!enabled || !ticker) return
    setTicks([])
    setConnected(false)

    const ws = new WebSocket(`${wsBase()}/ws/live/${encodeURIComponent(ticker)}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      try {
        const t = JSON.parse(e.data) as Tick
        setTicks(prev => [...prev.slice(-(max - 1)), t])
      } catch {
        /* ignore malformed */
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [ticker, enabled, max])

  return { ticks, connected }
}
