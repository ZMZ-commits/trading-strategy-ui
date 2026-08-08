/** Drawing model shared by the canvas layer, the toolbar and the API.
 *
 *  Every shape is a list of {time, price} anchors rather than fixed corner
 *  fields, so a one-anchor level, a two-anchor trendline and a three-level
 *  position tool all round-trip through one schema. Anchors are stored in
 *  chart units (ISO time + price), never pixels, so shapes stay glued to the
 *  data through zoom, pan and interval changes. */

export type ToolKind =
  | 'trendline' | 'ray' | 'hline' | 'vline' | 'rect' | 'fib'
  | 'long' | 'short' | 'text'

export type Tool = 'cursor' | ToolKind

export interface Anchor {
  /** ISO timestamp. */
  t: string
  p: number
}

export interface Shape {
  id: string
  kind: ToolKind
  points: Anchor[]
  text?: string
  color?: string
  width?: number
  /** Position tools only: the stop level. Entry is points[0].p, target is points[1].p. */
  stop?: number
}

/** How many anchors a tool needs before the shape is complete. */
export const ANCHOR_COUNT: Record<ToolKind, number> = {
  trendline: 2, ray: 2, rect: 2, fib: 2, long: 2, short: 2,
  hline: 1, vline: 1, text: 1,
}

export const DEFAULT_COLOR = '#f59e0b'

export const TOOL_LABELS: Record<Tool, string> = {
  cursor: 'Select',
  trendline: 'Trend line',
  ray: 'Ray',
  hline: 'Horizontal line',
  vline: 'Vertical line',
  rect: 'Rectangle',
  fib: 'Fib retracement',
  long: 'Long position',
  short: 'Short position',
  text: 'Text',
}

/** Fib levels drawn between the two anchors. */
export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

export const PALETTE = ['#f59e0b', '#22c55e', '#ef4444', '#60a5fa', '#a855f7', '#e5e7eb']
