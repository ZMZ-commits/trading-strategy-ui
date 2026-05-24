import type { RunResult } from '../types'

export async function runStrategy(id: string, config: Record<string, unknown> = {}): Promise<RunResult> {
  const res = await fetch(`/strategies/${id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  })
  if (res.status === 404) throw new Error('Strategy not found')
  if (res.status === 409) throw new Error('Strategy is already running')
  if (!res.ok) throw new Error('Failed to run strategy')
  return res.json()
}

export async function getStrategyStatus(id: string): Promise<RunResult> {
  const res = await fetch(`/strategies/${id}/status`)
  if (res.status === 404) throw new Error('Strategy not found')
  if (!res.ok) throw new Error('Failed to get status')
  return res.json()
}
