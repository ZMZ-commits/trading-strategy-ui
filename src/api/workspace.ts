import { API_BASE } from './config'

export interface ScaffoldResult {
  kind: 'strategy' | 'indicator'
  name: string
  slug: string
  path: string
}

export interface WorkspaceItems {
  strategies: string[]
  indicators: string[]
}

/** List the strategy/indicator folders currently in the IDE workspace. */
export async function listItems(): Promise<WorkspaceItems> {
  const res = await fetch(`${API_BASE}/workspace/items`)
  if (!res.ok) throw new Error('Failed to load workspace items')
  return res.json()
}

/** Delete a strategy/indicator folder from the IDE workspace. */
export async function deleteItem(kind: 'strategy' | 'indicator', slug: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workspace/${kind}/${encodeURIComponent(slug)}`, { method: 'DELETE' })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Failed to delete ${kind}`)
  }
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
