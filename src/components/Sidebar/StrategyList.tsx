import type { Strategy } from '../../types'

const BADGE: Record<string, string> = {
  idle: 'bg-gray-600',
  running: 'bg-yellow-500 animate-pulse',
  completed: 'bg-green-500',
  error: 'bg-red-500',
}

interface Props { strategies: Strategy[]; selectedId: string | null; onSelect: (s: Strategy) => void }

export function StrategyList({ strategies, selectedId, onSelect }: Props) {
  if (strategies.length === 0)
    return <p className="p-3 text-xs text-gray-600 text-center">No strategies yet</p>

  return (
    <ul className="py-1">
      {strategies.map(s => (
        <li key={s.id}>
          <button
            onClick={() => onSelect(s)}
            className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-700 transition-colors ${s.id === selectedId ? 'bg-gray-700' : ''}`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${BADGE[s.last_run_status ?? 'idle']}`} />
            <span className="text-xs text-gray-300 truncate">{s.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
