import type { Strategy } from '../types'

export async function getStrategies(): Promise<Strategy[]> {
  const res = await fetch('/strategies')
  if (!res.ok) throw new Error('Failed to fetch strategies')
  return res.json()
}

export async function createStrategy(name: string): Promise<Strategy> {
  const res = await fetch('/strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (res.status === 409) throw new Error('Strategy with this name already exists')
  if (!res.ok) throw new Error('Failed to create strategy')
  return res.json()
}

export async function deleteStrategy(id: string): Promise<void> {
  const res = await fetch(`/strategies/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete strategy')
}
