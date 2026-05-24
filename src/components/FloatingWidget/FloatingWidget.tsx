import { useState } from 'react'
import { useDraggable } from '../../hooks/useDraggable'
import { WidgetIcon } from './WidgetIcon'
import { WidgetPanel } from './WidgetPanel'

const WIDGET_W = 224

export function FloatingWidget() {
  const [expanded, setExpanded] = useState(false)
  const { pos, onMouseDown } = useDraggable(
    { x: window.innerWidth - WIDGET_W - 8, y: 80 },
    { snapToEdge: true, elementWidth: WIDGET_W },
  )

  return (
    <div style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 50 }}>
      {expanded
        ? <WidgetPanel onCollapse={() => setExpanded(false)} onMouseDown={onMouseDown} />
        : <WidgetIcon onExpand={() => setExpanded(true)} onMouseDown={onMouseDown} />
      }
    </div>
  )
}
