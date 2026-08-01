import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ExportFormat } from '../../utils/exportDataset'

interface Props {
  /** Shown in the menu header so it's clear what's being exported. */
  title: string
  onPick: (format: ExportFormat) => void
  busy?: boolean
}

const FORMATS: { key: ExportFormat; label: string; hint: string }[] = [
  { key: 'csv', label: 'CSV', hint: 'One row per bar — opens in Excel/pandas' },
  { key: 'json', label: 'JSON', hint: 'Same rows, plus dataset metadata' },
]

/** Download action with a small format menu.
 *
 *  Portalled rather than absolutely positioned: the label list scrolls inside
 *  an overflow container that would otherwise clip the menu. */
export function DownloadMenu({ title, onPick, busy }: Props) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // The row scrolls, so the anchor moves out from under the menu.
    const onScroll = () => setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (busy) return
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: Math.min(r.left - 120, window.innerWidth - 210) })
    }
    setOpen(o => !o)
  }

  return (
    <>
      <span
        ref={btnRef}
        role="button"
        tabIndex={-1}
        onClick={toggle}
        title={busy ? 'Exporting…' : 'Download this labelled dataset'}
        className={`text-[10px] ${busy ? 'text-gray-500' : 'text-gray-600 hover:text-blue-400'}`}
      >
        {busy ? 'exporting…' : 'download'}
      </span>

      {open && !busy && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 200, zIndex: 9999 }}
          className="bg-panel border border-border rounded-lg shadow-2xl overflow-hidden text-xs"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 border-b border-border/60 bg-surface/40">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Export</p>
            <p className="text-[10px] text-gray-400 truncate" title={title}>{title}</p>
          </div>
          {FORMATS.map(f => (
            <button
              key={f.key}
              onClick={() => { setOpen(false); onPick(f.key) }}
              className="w-full text-left px-2.5 py-1.5 hover:bg-surface transition-colors border-b border-border/30 last:border-b-0"
            >
              <span className="text-gray-100">{f.label}</span>
              <span className="block text-[10px] text-gray-600 leading-tight">{f.hint}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
