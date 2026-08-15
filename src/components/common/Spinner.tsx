/** Indeterminate loading spinner.
 *
 *  Deliberately not a progress bar: these are waits whose length isn't known
 *  (a fetch, a resample, a running job), and a bar that can't report real
 *  progress is worse than an honest spinner. Where a real count exists --
 *  chunked history pulls -- ChunkProgress shows it instead.
 */
export function Spinner({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      role="status" aria-label="Loading"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Spinner plus a label, centred in whatever box it's dropped into. */
export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center gap-2 py-6 text-gray-500">
      <Spinner size={16} />
      <span className="text-xs">{label}</span>
    </div>
  )
}
