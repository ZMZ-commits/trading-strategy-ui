import { API_BASE } from './config'
import type { OHLCBar, StockSnapshot, IndexQuote, Range, Interval } from '../types'

export async function getHistory(ticker: string, range: Range, interval?: Interval, start?: string, end?: string): Promise<{ ticker: string; range: string; bars: OHLCBar[] }> {
  const params = new URLSearchParams({ range })
  if (interval) params.set('interval', interval)
  if (start && end) { params.set('start', start); params.set('end', end) }
  const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/history?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch history for ${ticker}`)
  return res.json()
}

export async function getSnapshot(ticker: string): Promise<StockSnapshot> {
  const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}`)
  if (!res.ok) throw new Error(`Failed to fetch snapshot for ${ticker}`)
  return res.json()
}

export async function getIndices(): Promise<IndexQuote[]> {
  const res = await fetch(`${API_BASE}/market/indices`)
  if (!res.ok) throw new Error('Failed to fetch indices')
  return res.json()
}

// ── Chunked history jobs ─────────────────────────────────────────────────
// Fine intervals over long ranges need several sequential upstream fetches,
// so they run as a tracked job with progress instead of one long request.

export type HistoryJobStatus = 'pending' | 'running' | 'ready' | 'error' | 'cancelled'

export interface HistoryJob {
  id: string
  ticker: string
  range: string
  interval: string
  status: HistoryJobStatus
  created_at: string
  progress: { done: number; total: number }
  row_count: number
  error: string | null
  cancel_requested: boolean
  /** Set only when the request reached past the interval's hard limit. */
  effective_start: string | null
  requested_start: string
  /** Present once status is 'ready'. */
  bars?: OHLCBar[]
}

async function jobReq<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Request failed: ${path}`)
  }
  return res.json()
}

export const createHistoryJob = (ticker: string, range: Range, interval: Interval) =>
  jobReq<HistoryJob>(`/stocks/${encodeURIComponent(ticker)}/history/jobs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, interval }),
  })

export const getHistoryJob = (id: string) => jobReq<HistoryJob>(`/stocks/history/jobs/${id}`)

export const cancelHistoryJob = (id: string) =>
  jobReq<HistoryJob>(`/stocks/history/jobs/${id}/cancel`, { method: 'POST' })
