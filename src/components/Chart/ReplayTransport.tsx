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

/** Replay transport: a self-contained "liquid glass" pill (dark, frosted,
 *  rounded) placed BELOW the chart in normal flow -- not an overlay on top of
 *  it, so it can't fight the chart for clicks. Hidden by default; the parent
 *  (StockChart) fades/scales it in on hover. */
export function ReplayTransport({
  playing, onPlayPause, onRestart, index, total, onSeek, speed, onSpeedChange, speeds, currentDate,
}: Props) {
  const pct = total > 1 ? ((index - 1) / (total - 1)) * 100 : 0

  return (
    <div className="flex items-center gap-3 select-none rounded-full border border-white/10 bg-black/40 backdrop-blur-xl px-3 py-2 shadow-lg shadow-black/30">
      {/* Transport buttons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={onRestart} title="Restart" aria-label="Restart"
          className="p-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10"
        ><Icon path={RESTART} /></button>
        <button
          onClick={onPlayPause} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}
          className="p-1 rounded-full text-white hover:bg-white/10"
        ><Icon path={playing ? PAUSE : PLAY} /></button>
      </div>

      {/* Seekable progress bar */}
      <div className="relative flex-1 h-4 flex items-center">
        <div className="h-1 w-full rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-[width] duration-100" style={{ width: `${pct}%` }} />
        </div>
        <div
          className="absolute h-3 w-3 rounded-full bg-blue-400 shadow -translate-x-1/2 pointer-events-none"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range" min={1} max={Math.max(1, total)} value={index}
          onChange={e => onSeek(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Replay position"
        />
      </div>

      {/* Counter + date + speed */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] text-gray-300 tabular-nums whitespace-nowrap">{index}/{total}</span>
        {currentDate && <span className="text-[11px] text-gray-400 whitespace-nowrap hidden sm:inline">{currentDate}</span>}
        <select
          value={speed} onChange={e => onSpeedChange(Number(e.target.value))} title="Speed"
          className="text-xs bg-white/10 border border-white/10 rounded-full px-2 py-0.5 text-gray-200"
        >
          {speeds.map(s => <option key={s} value={s} className="bg-gray-900 text-gray-100">{s}×</option>)}
        </select>
      </div>
    </div>
  )
}
