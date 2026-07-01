import { useState } from 'react'

interface Props {
  start: string // 'YYYY-MM-DD' or ''
  end: string
  onChange: (start: string, end: string) => void
}

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function parse(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Compact single-month calendar range picker: click a start day, then an end
 *  day; the span highlights. Clicking again starts a new range. No deps. */
export function DateRangePicker({ start, end, onChange }: Props) {
  const startD = parse(start)
  const endD = parse(end)
  const [view, setView] = useState<Date>(() => startD ?? new Date())

  const year = view.getFullYear()
  const month = view.getMonth()
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const inRange = (d: Date) => startD && endD && d > startD && d < endD
  const isEnd = (d: Date) => (startD && sameDay(d, startD)) || (endD && sameDay(d, endD))

  const pick = (d: Date) => {
    if (!startD || (startD && endD)) onChange(fmt(d), '')       // begin a new range
    else if (d < startD) onChange(fmt(d), '')                   // clicked before start → restart
    else onChange(start, fmt(d))                                // set the end
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button" onClick={() => setView(new Date(year, month - 1, 1))}
          className="px-1.5 rounded text-gray-400 hover:bg-gray-700 hover:text-gray-100" aria-label="Previous month"
        >‹</button>
        <span className="text-[11px] text-gray-300">
          {view.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button" onClick={() => setView(new Date(year, month + 1, 1))}
          className="px-1.5 rounded text-gray-400 hover:bg-gray-700 hover:text-gray-100" aria-label="Next month"
        >›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] text-gray-600 mb-0.5">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <div key={i}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => d ? (
          <button
            type="button" key={i} onClick={() => pick(d)}
            className={`h-6 text-[10px] rounded transition-colors ${
              isEnd(d) ? 'bg-blue-600 text-white'
                : inRange(d) ? 'bg-blue-600/25 text-blue-200'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >{d.getDate()}</button>
        ) : <div key={i} />)}
      </div>
    </div>
  )
}
