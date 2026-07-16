import { API_BASE } from './config'
import type { OHLCBar } from '../types'
import type { CustomSeries } from './custom'
import type { StrategyChartData } from './strategyChart'

export type DatasetStatus = 'pending' | 'running' | 'ready' | 'error' | 'cancelled'

export interface DatasetMeta {
  id: string
  name: string
  ticker: string
  start: string
  end: string
  interval: string
  status: DatasetStatus
  created_at: string
  row_count: number
  progress: { done: number; total: number }
  error: string | null
  cancel_requested: boolean
  effective_start?: string
}

export type BacktestStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled'

interface RawBacktestResult {
  indicators: Record<string, { kind?: string; time: string[]; values: (number | null)[] }>
  signals: { time: string; type: 'buy' | 'sell'; price: number }[]
  logs: { time: string | null; msg: string }[]
  pnl: number
  requires: string[]
}

export interface BacktestMeta {
  id: string
  dataset_id: string
  strategy_slug: string
  status: BacktestStatus
  created_at: string
  cancel_requested: boolean
  error: string | null
  result: RawBacktestResult | null
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Request failed: ${path}`)
  }
  return res.json()
}

export const createDataset = (ticker: string, start: string, end: string, interval: string, name?: string) =>
  req<DatasetMeta>('/datasets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, start, end, interval, name: name || undefined }),
  })

export const listDatasets = () => req<{ datasets: DatasetMeta[] }>('/datasets').then(d => d.datasets)
export const getDataset = (id: string) => req<DatasetMeta>(`/datasets/${id}`)
export const getDatasetBars = (id: string) => req<{ bars: OHLCBar[] }>(`/datasets/${id}/bars`).then(d => d.bars)
export const cancelDataset = (id: string) => req<DatasetMeta>(`/datasets/${id}/cancel`, { method: 'POST' })
export const deleteDataset = (id: string) => req<void>(`/datasets/${id}`, { method: 'DELETE' })

export const createBacktest = (datasetId: string, strategySlug: string) =>
  req<BacktestMeta>(`/datasets/${datasetId}/backtests`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy_slug: strategySlug }),
  })

export const listBacktests = (datasetId: string) =>
  req<{ backtests: BacktestMeta[] }>(`/datasets/${datasetId}/backtests`).then(d => d.backtests)
export const getBacktest = (datasetId: string, backtestId: string) =>
  req<BacktestMeta>(`/datasets/${datasetId}/backtests/${backtestId}`)
export const cancelBacktest = (datasetId: string, backtestId: string) =>
  req<BacktestMeta>(`/datasets/${datasetId}/backtests/${backtestId}/cancel`, { method: 'POST' })

/** Compute indicators over caller-supplied bars (e.g. a Lab dataset's stored/
 *  resampled bars) instead of a live fetch -- same math as the live indicators
 *  endpoint. Pass the FULL series you want indicators computed over (not a
 *  display-trimmed slice), so long-lookback averages have real history;
 *  trim the result for display yourself afterward. */
export const computeIndicators = (bars: OHLCBar[], studies: string[]) =>
  req<{ indicators: Record<string, { kind?: string; time: string[]; values: (number | null)[] }> }>(
    '/indicators/compute',
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bars, studies }),
    },
  ).then(d => d.indicators)

/** Convert a completed backtest's raw sandbox result into the same shape the
 *  live strategy chart hook produces, so LWChart can render it identically
 *  (dashed line(s) + Buy/Sell markers). */
export function backtestToChartData(bt: BacktestMeta): StrategyChartData {
  if (!bt.result) return { lines: [], signals: [], logs: [], requires: [], pnl: 0 }
  const lines: CustomSeries[] = Object.entries(bt.result.indicators).map(([name, s]) => ({
    name, kind: s.kind ?? 'overlay', time: s.time, values: s.values,
  }))
  return {
    lines,
    signals: bt.result.signals.map(s => ({ time: s.time, type: s.type, price: s.price })),
    logs: bt.result.logs,
    requires: bt.result.requires,
    pnl: bt.result.pnl,
  }
}
