import { useState } from 'react'

interface Props { current: string; onSubmit: (ticker: string) => void }

export function TickerInput({ current, onSubmit }: Props) {
  const [value, setValue] = useState(current)
  const submit = () => { const t = value.trim().toUpperCase(); if (t) onSubmit(t) }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text" value={value}
        onChange={e => setValue(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Ticker..."
        className="w-24 px-3 py-1.5 text-sm font-mono bg-surface border border-border rounded text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 uppercase"
      />
      <button onClick={submit} className="px-3 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">Go</button>
    </div>
  )
}
