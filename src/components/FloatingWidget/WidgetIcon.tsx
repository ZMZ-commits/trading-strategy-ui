interface Props { onExpand: () => void; onMouseDown: (e: React.MouseEvent) => void }

export function WidgetIcon({ onExpand, onMouseDown }: Props) {
  return (
    <button
      onMouseDown={e => { onMouseDown(e); e.stopPropagation() }}
      onClick={onExpand}
      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 shadow-lg flex items-center justify-center text-white transition-colors"
      title="Market Overview"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    </button>
  )
}
