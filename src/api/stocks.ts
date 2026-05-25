import { API_BASE } from './config'
import type { OHLCBar, StockSnapshot, IndexQuote, Range } from '../types'

export async function getHistory(ticker: string, range: Range): Promise<{ ticker: string; range: string; bars: OHLCBar[] }> {
  const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/history?range=${range}`)
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
