import type { Range, Interval } from '../types'

/** How far back each interval can reach AT ALL. These are upstream retention
 *  limits enforced server-side by the data provider -- fetching day-by-day does
 *  NOT get you further back, it only splits one long request into several.
 *  Verified against the live API: 1m returns nothing past ~30 days and 1h
 *  nothing past ~730, while daily and coarser are effectively unlimited. */
const INTERVAL_MAX_DAYS: Partial<Record<Interval, number>> = { '1s': 30, '1m': 30, '1h': 730 }

/** Max days per upstream request, per interval — mirrors the backend's
 *  CHUNK_DAYS. Used only to predict whether a fetch will need several rounds
 *  (and therefore a progress indicator). */
const CHUNK_DAYS: Partial<Record<Interval, number>> = { '1s': 7, '1m': 7, '1h': 60 }

/** Approximate span of each range — mirrors the backend's RANGE_DAYS. */
const RANGE_DAYS: Record<Range, number> = {
  NOW: 1, '30M': 1, '1H': 1, '5H': 1, '1D': 1, '5D': 5,
  '1M': 31, '3M': 92, '6M': 183, YTD: 365, '1Y': 366, '5Y': 1826, MAX: 7300,
}

/** A requested interval is never substituted for a coarser one: picking 1m
 *  charts 1m, even on MAX, showing however far back that data actually exists
 *  (the fetch reports where it had to stop, and the UI says so). The limits
 *  above are only used to size the work, not to override the choice. */

/** How many upstream requests a (range, interval) pull will take. */
export function chunkCount(interval: Interval, range: Range): number {
  const chunk = CHUNK_DAYS[interval]
  if (chunk == null) return 1 // daily+ comes back in a single request
  const reach = INTERVAL_MAX_DAYS[interval] ?? RANGE_DAYS[range]
  const days = Math.min(RANGE_DAYS[range], reach)
  return Math.max(1, Math.ceil(days / chunk))
}

/** True when a pull needs several sequential upstream requests, and so should
 *  run as a tracked job with a progress ring instead of a plain fetch. */
export function isLongPull(interval: Interval | undefined, range: Range): boolean {
  if (!interval) return false
  return chunkCount(interval, range) > 1
}
