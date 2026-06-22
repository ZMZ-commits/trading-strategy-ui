interface Props { value: string; onChange: (v: string) => void; placeholder?: string }

export function StrategySearch({ value, onChange, placeholder = 'Search studies...' }: Props) {
  return (
    <div className="relative">
      <svg className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-7 pr-2 py-1.5 text-xs bg-surface border border-border rounded text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}
