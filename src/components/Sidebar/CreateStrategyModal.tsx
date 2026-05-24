import { useState } from 'react'
import { createStrategy } from '../../api/strategies'

interface Props { onClose: () => void; onCreated: () => void }

export function CreateStrategyModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true); setError(null)
    try {
      await createStrategy(name.trim())
      onCreated()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-panel border border-border rounded-lg p-5 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-semibold text-gray-200 mb-4">New Strategy</h2>
        <input
          autoFocus type="text" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Strategy name..."
          className="w-full px-3 py-2 text-sm bg-surface border border-border rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 mb-3"
        />
        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded text-gray-400 hover:text-gray-200">Cancel</button>
          <button
            onClick={handleSave} disabled={!name.trim() || loading}
            className="px-4 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-colors"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
