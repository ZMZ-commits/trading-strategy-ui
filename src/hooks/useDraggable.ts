import { useRef, useState, useCallback, useEffect } from 'react'

interface Pos { x: number; y: number }
interface Options { snapToEdge?: boolean; elementWidth?: number }

export function useDraggable(initialPos: Pos, options: Options = {}) {
  const { snapToEdge = false, elementWidth = 200 } = options
  const [pos, setPos] = useState<Pos>(initialPos)
  const dragging = useRef(false)
  const offset = useRef<Pos>({ x: 0, y: 0 })

  const snap = useCallback(
    (x: number) => (x + elementWidth / 2 < window.innerWidth / 2 ? 8 : window.innerWidth - elementWidth - 8),
    [elementWidth],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true
      offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
      e.preventDefault()
    },
    [pos],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y })
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      if (snapToEdge) setPos(prev => ({ ...prev, x: snap(prev.x) }))
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [snapToEdge, snap])

  return { pos, setPos, onMouseDown }
}
