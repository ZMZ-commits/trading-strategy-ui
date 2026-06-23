import { API_BASE } from './config'
import type { Range, Interval } from '../types'

export interface CustomIndicatorMeta {
  slug: string
  name: string
  kind: string
}

export interface CustomSeries {
  name: string
  kind: string // 'overlay' | 'oscillator'
  time: string[]
  values: (number | null)[]
}

/** List published custom indicators available to render. */
export async function getCustomIndicators(): Promise<CustomIndicatorMeta[]> {
  const res = await fetch(`${API_BASE}/custom`)
  if (!res.ok) return []
  const j = await res.json()
  return (j.indicators ?? []) as CustomIndicatorMeta[]
}

/** Run a published custom indicator over a ticker/range and return its series. */
export async function getCustomSeries(
  ticker: string,
  slug: string,
  range: Range,
  interval?: Interval,
): Promise<CustomSeries[]> {
  const params = new URLSearchParams({ range })
  if (interval) params.set('interval', interval)
  const res = await fetch(`${API_BASE}/stocks/${encodeURIComponent(ticker)}/custom/${encodeURIComponent(slug)}?${params}`)
  if (!res.ok) return []
  const j = await res.json()
  const out: CustomSeries[] = []
  for (const [name, s] of Object.entries(j.indicators ?? {})) {
    const series = s as { kind?: string; time: string[]; values: (number | null)[] }
    out.push({ name, kind: series.kind ?? 'overlay', time: series.time, values: series.values })
  }
  return out
}
