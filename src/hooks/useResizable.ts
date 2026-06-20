import { useRef, useState, useCallback, useEffect } from 'react'

// direction='up'  — drag handle at top, drag upward to grow (BottomPanel)
// direction='down' — drag handle at bottom, drag downward to grow (TopPanel)
// onCollapse — if provided, dragging the handle past the minimum collapses the panel.
export function useResizable(
  initialHeight: number,
  min = 120,
  direction: 'up' | 'down' = 'up',
  onCollapse?: () => void,
) {
  const [height, setHeight] = useState(initialHeight)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startH = useRef(initialHeight)

  const onDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      startY.current = e.clientY
      startH.current = height
      e.preventDefault()
    },
    [height],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const max = window.innerHeight * 0.6
      const delta = direction === 'up'
        ? startY.current - e.clientY
        : e.clientY - startY.current
      const raw = startH.current + delta
      // Dragging well past the minimum collapses the panel instead of clamping.
      if (onCollapse && raw < min - 24) {
        dragging.current = false
        onCollapse()
        return
      }
      const next = Math.min(Math.max(raw, min), max)
      setHeight(next)
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [min, direction, onCollapse])

  return { height, onDragHandleMouseDown }
}
