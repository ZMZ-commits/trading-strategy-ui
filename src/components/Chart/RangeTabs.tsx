import type { Range } from '../../types'

const RANGES: Range[] = ['NOW', '30M', '1H', '5H', '1D', '1W', '1M', '1Y', '5Y', 'MAX']

interface Props { active: Range; onChange: (r: Range) => void }

export function RangeTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 w-max">
      {RANGES.map(r => (
        <button
          key={r} onClick={() => onChange(r)}
          className={`flex-shrink-0 px-2.5 py-1.5 text-xs rounded font-medium whitespace-nowrap transition-colors ${
            r === active ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700 active:bg-gray-700'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  )
}
