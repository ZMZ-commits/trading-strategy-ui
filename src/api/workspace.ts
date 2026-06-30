import { API_BASE } from './config'

export interface ScaffoldResult {
  kind: 'strategy' | 'indicator'
  name: string
  slug: string
  path: string
}

/** Create a starter strategy/indicator folder in the IDE workspace. */
export async function scaffold(kind: 'strategy' | 'indicator', name: string): Promise<ScaffoldResult> {
  const res = await fetch(`${API_BASE}/workspace/scaffold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, name }),
  })
  if (res.status === 409) throw new Error(`A ${kind} with that name already exists`)
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Failed to create ${kind}`)
  }
  return res.json()
}
