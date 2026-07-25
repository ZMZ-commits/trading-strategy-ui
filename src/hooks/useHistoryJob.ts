import { useState, useEffect, useRef, useCallback } from 'react'
import { createHistoryJob, getHistoryJob, cancelHistoryJob, type HistoryJob } from '../api/stocks'
import type { OHLCBar, Range, Interval } from '../types'

// Short enough that a multi-chunk pull visibly counts up rather than snapping
// from 0% straight to done — most chunks land well inside a second.
const POLL_MS = 250

export interface HistoryJobState {
  bars: OHLCBar[]
  loading: boolean
  error: string | null
  /** 0..1 while running, for the progress ring. */
  progress: number
  /** Chunk counts, for "3 of 7" style detail. */
  done: number
  total: number
  /** Set when the range reached past the interval's hard limit, so the caller
   *  can explain why the chart shows less than was asked for. */
  effectiveStart: string | null
  cancel: () => void
}

const EMPTY: OHLCBar[] = []

/** Runs a chunked history pull as a tracked job, polling until it settles.
 *
 *  Enabled only for fetches that genuinely need several upstream rounds; the
 *  ordinary single-request path stays on useStockData. Results are cached per
 *  ticker+range+interval so flipping back to a window you already pulled is
 *  instant rather than re-running the whole job. */
export function useHistoryJob(
  ticker: string,
  range: Range,
  interval: Interval | undefined,
  enabled: boolean,
): HistoryJobState {
  const cache = useRef<Map<string, { bars: OHLCBar[]; effectiveStart: string | null }>>(new Map())
  const [bars, setBars] = useState<OHLCBar[]>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [effectiveStart, setEffectiveStart] = useState<string | null>(null)
  const jobIdRef = useRef<string | null>(null)

  const key = enabled && ticker && interval ? `${ticker}:${range}:${interval}` : ''

  useEffect(() => {
    jobIdRef.current = null
    if (!key) { setBars(EMPTY); setLoading(false); setError(null); setDone(0); setTotal(0); setEffectiveStart(null); return }

    const hit = cache.current.get(key)
    if (hit) {
      setBars(hit.bars); setEffectiveStart(hit.effectiveStart)
      setLoading(false); setError(null); setDone(0); setTotal(0)
      return
    }

    let cancelled = false          // the effect was torn down (window changed)
    let timer: number | undefined

    setLoading(true); setError(null); setBars(EMPTY); setDone(0); setTotal(0); setEffectiveStart(null)

    const settle = (job: HistoryJob) => {
      if (job.status === 'ready') {
        const result = { bars: job.bars ?? EMPTY, effectiveStart: job.effective_start }
        cache.current.set(key, result)
        setBars(result.bars); setEffectiveStart(result.effectiveStart); setLoading(false)
      } else if (job.status === 'error') {
        setError(job.error ?? 'History fetch failed'); setLoading(false)
      } else {
        // cancelled — leave the chart empty but don't show it as a failure
        setLoading(false)
      }
    }

    const poll = (id: string) => {
      timer = window.setTimeout(() => {
        getHistoryJob(id)
          .then(job => {
            if (cancelled) return
            setDone(job.progress.done); setTotal(job.progress.total)
            if (job.status === 'pending' || job.status === 'running') poll(id)
            else settle(job)
          })
          .catch(e => { if (!cancelled) { setError((e as Error).message); setLoading(false) } })
      }, POLL_MS)
    }

    createHistoryJob(ticker, range, interval!)
      .then(job => {
        if (cancelled) {
          // Window changed while the job was being created — don't leave it running.
          cancelHistoryJob(job.id).catch(() => {})
          return
        }
        jobIdRef.current = job.id
        setDone(job.progress.done); setTotal(job.progress.total)
        if (job.status === 'ready') settle(job); else poll(job.id)
      })
      .catch(e => { if (!cancelled) { setError((e as Error).message); setLoading(false) } })

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      // Stop server-side work for a window nobody is looking at anymore.
      if (jobIdRef.current) cancelHistoryJob(jobIdRef.current).catch(() => {})
    }
  }, [key, ticker, range, interval])

  const cancel = useCallback(() => {
    const id = jobIdRef.current
    if (!id) return
    cancelHistoryJob(id).catch(() => {})
    setLoading(false)
  }, [])

  return {
    bars, loading, error,
    progress: total > 0 ? done / total : 0,
    done, total, effectiveStart, cancel,
  }
}
