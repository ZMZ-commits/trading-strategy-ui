interface Props {
  /** 0..1 */
  progress: number
  done: number
  total: number
  label?: string
  onCancel?: () => void
}

const SIZE = 92
const STROKE = 6
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

/** Determinate ring for a chunked ("long") pull — the kind that takes several
 *  sequential upstream requests. A plain spinner would say "busy" without
 *  saying how busy, which is the whole problem with these fetches. */
export function ChunkProgress({ progress, done, total, label, onCancel }: Props) {
  const pct = Math.max(0, Math.min(1, progress))
  // With no chunk count there is nothing to fill, so the ring spins instead of
  // sitting at zero -- a static ring reads as a hung load.
  const indeterminate = total <= 0
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 select-none">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className={indeterminate ? 'animate-spin' : '-rotate-90'}>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" stroke="currentColor" strokeWidth={STROKE}
            className="text-gray-700/60"
          />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={indeterminate ? CIRC * 0.75 : CIRC * (1 - pct)}
            className="text-blue-500 transition-[stroke-dashoffset] duration-300 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* A hard "0%" under a spinning ring reads as stalled, so the figure
              only appears once there is a real one to show. */}
          {!indeterminate && (
            <span className="text-lg font-semibold text-gray-100 tabular-nums leading-none">
              {Math.round(pct * 100)}%
            </span>
          )}
          {total > 0 && (
            <span className="text-[10px] text-gray-500 tabular-nums mt-0.5">{done}/{total}</span>
          )}
        </div>
      </div>

      {label && <p className="text-xs text-gray-500">{label}</p>}

      {onCancel && (
        <button
          onClick={onCancel}
          className="px-2.5 py-1 text-xs rounded border border-border text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
