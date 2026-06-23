import { API_BASE } from './config'

export interface Artifact {
  name: string
  slug: string
  type: string
  path: string
  labPath: string // e.g. /lab/tree/my-ema.ipynb
}

export interface NotebookDraft {
  name: string
  path: string
}

// Where the authoring JupyterLab is reachable FROM THE BROWSER. Default is the
// SSH tunnel (localhost:8888). Override with VITE_JUPYTER_URL if exposed elsewhere.
export const JUPYTER_BASE =
  (import.meta.env.VITE_JUPYTER_URL as string | undefined) ?? 'http://localhost:8888'

export function labUrl(labPath: string): string {
  return `${JUPYTER_BASE}${labPath}`
}

/** Create a seeded authoring notebook for a new indicator/strategy. */
export async function createArtifact(name: string, type: 'indicator' | 'strategy' = 'indicator'): Promise<Artifact> {
  const res = await fetch(`${API_BASE}/custom/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, type }),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.detail ?? 'Could not create — is JupyterLab reachable (tunnel + token)?')
  }
  return res.json()
}

/** List draft notebooks in the JupyterLab workspace. */
export async function getNotebooks(): Promise<NotebookDraft[]> {
  const res = await fetch(`${API_BASE}/notebooks`)
  if (!res.ok) return []
  const j = await res.json()
  return (j.notebooks ?? []) as NotebookDraft[]
}
