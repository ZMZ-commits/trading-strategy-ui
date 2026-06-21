// Lazily loads the Pyodide (Python-in-WebAssembly) runtime from the CDN so user
// indicator/strategy code can run entirely in the browser — no server-side code
// execution, no bundled WASM. The runtime is fetched once and reused.

const PYODIDE_VERSION = 'v0.26.4'
const CDN = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`

export interface Pyodide {
  runPython: (code: string) => unknown
  globals: { set: (key: string, value: unknown) => void; get: (key: string) => unknown }
}

declare global {
  interface Window {
    loadPyodide?: (opts?: { indexURL?: string }) => Promise<Pyodide>
  }
}

let pyodidePromise: Promise<Pyodide> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load the Python runtime (Pyodide).'))
    document.head.appendChild(s)
  })
}

// Returns a shared Pyodide instance, loading it on first call.
export function getPyodide(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await loadScript(`${CDN}pyodide.js`)
      if (!window.loadPyodide) throw new Error('Pyodide failed to initialize.')
      return window.loadPyodide({ indexURL: CDN })
    })().catch(err => {
      pyodidePromise = null // allow retry on failure
      throw err
    })
  }
  return pyodidePromise
}
