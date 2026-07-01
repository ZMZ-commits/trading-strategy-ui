interface Props {
  playing: boolean
  onPlayPause: () => void
  onRestart: () => void
  index: number
  total: number
  onSeek: (n: number) => void
  speed: number
  onSpeedChange: (s: number) => void
  speeds: number[]
  currentDate?: string
}

const PLAY = 'M8 5v14l11-7z'
const PAUSE = 'M6 5h3.5v14H6zm8.5 0H18v14h-3.5z'
const RESTART = 'M7 6h2v12H7zm3.5 6l8.5 6V6z'

function Icon({ path }: { path: string }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

/** Replay transport: a thin always-visible progress bar; the buttons, counter
 *  and speed reveal on hover (video-player style). Seek by dragging the bar. */
export function ReplayTransport({
  playing, onPlayPause, onRestart, index, total, onSeek, speed, onSpeedChange, speeds, currentDate,
}: Props) {
  const pct = total > 1 ? ((index - 1) / (total - 1)) * 100 : 0

  return (
    <div className="group mt-2 flex items-center gap-2 flex-shrink-0 select-none">
      {/* Transport buttons — reveal on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onRestart} title="Restart" aria-label="Restart"
          className="p-1 rounded text-gray-400 hover:text-gray-100 hover:bg-gray-700"
        ><Icon path={RESTART} /></button>
        <button
          onClick={onPlayPause} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}
          className="p-1 rounded text-gray-200 hover:text-white hover:bg-gray-700"
        ><Icon path={playing ? PAUSE : PLAY} /></button>
      </div>

      {/* Seekable progress bar — always visible */}
      <div className="relative flex-1 h-4 flex items-center">
        <div className="h-1 w-full rounded-full bg-gray-700 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-[width] duration-100" style={{ width: `${pct}%` }} />
        </div>
        <div
          className="absolute h-3 w-3 rounded-full bg-blue-400 shadow -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range" min={1} max={Math.max(1, total)} value={index}
          onChange={e => onSeek(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Replay position"
        />
      </div>

      {/* Counter + date + speed — reveal on hover */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[11px] text-gray-500 tabular-nums whitespace-nowrap">{index}/{total}</span>
        {currentDate && <span className="text-[11px] text-gray-500 whitespace-nowrap hidden sm:inline">{currentDate}</span>}
        <select
          value={speed} onChange={e => onSpeedChange(Number(e.target.value))} title="Speed"
          className="text-xs bg-surface border border-border rounded px-1 py-0.5 text-gray-300"
        >
          {speeds.map(s => <option key={s} value={s}>{s}×</option>)}
        </select>
      </div>
    </div>
  )
}
