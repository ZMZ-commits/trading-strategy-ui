import type { MouseEvent } from 'react'

interface Props {
  /** 'vertical' = a vertical bar you drag left/right (ew). 'horizontal' = a
   *  horizontal bar you drag up/down (ns). */
  orientation: 'vertical' | 'horizontal'
  onMouseDown: (e: MouseEvent) => void
  title?: string
}

/** Subtle, professional resize handle. At rest it's just a hairline; on hover
 *  it shows a blue line plus a 3-dot grip indicating the drag direction. The
 *  hit area is larger than the visible line so it stays easy to grab. */
export function ResizeHandle({ orientation, onMouseDown, title = 'Drag to resize' }: Props) {
  const vertical = orientation === 'vertical'
  return (
    <div
      onMouseDown={onMouseDown}
      title={title}
      className={`group relative flex-shrink-0 flex items-center justify-center ${
        vertical ? 'w-2 cursor-ew-resize self-stretch' : 'h-2 w-full cursor-ns-resize'
      }`}
    >
      {/* hairline at rest → blue on hover */}
      <span className={`${vertical ? 'w-px h-full' : 'h-px w-full'} bg-border/50 group-hover:bg-blue-500 transition-colors`} />
      {/* 3-dot grip, fades in on hover */}
      <span className={`absolute flex ${vertical ? 'flex-col' : 'flex-row'} gap-[3px] opacity-0 group-hover:opacity-100 transition-opacity`}>
        <span className="w-[3px] h-[3px] rounded-full bg-blue-400" />
        <span className="w-[3px] h-[3px] rounded-full bg-blue-400" />
        <span className="w-[3px] h-[3px] rounded-full bg-blue-400" />
      </span>
    </div>
  )
}
