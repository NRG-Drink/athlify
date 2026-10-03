/** Number of whole days between two instants (not rounded). */
const DAY = 24 * 60 * 60 * 1000

export interface NiceScale {
  /** Axis bounds, rounded outwards to the tick step. */
  domain: [number, number]
  ticks: number[]
}

/** Round, readable value ticks (1, 2, 2.5, 5 × 10ⁿ) that cover `min`..`max`. */
export function niceScale(min: number, max: number, count = 4): NiceScale {
  const range = max - min
  const rawStep = (range > 0 ? range : Math.max(Math.abs(max) * 0.02, 1)) / (count - 1)
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const residual = rawStep / magnitude
  const nice =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10
  const step = nice * magnitude

  const low = Math.floor(min / step) * step
  const high = Math.max(Math.ceil(max / step) * step, low + step)
  const ticks: number[] = []
  for (let value = low; value <= high + step / 1e6; value += step) {
    ticks.push(Number(value.toFixed(10)))
  }
  return { domain: [low, high], ticks }
}

/**
 * Tick positions (ms) for a time axis: weekly or daily for short spans, month starts for longer
 * ones, thinned to at most `maxTicks`.
 */
export function timeTicks(start: Date, end: Date, maxTicks: number): number[] {
  const days = (end.getTime() - start.getTime()) / DAY
  const all: number[] = []

  if (days <= 45) {
    const stepDays = days <= 10 ? 1 : days <= 21 ? 3 : 7
    const first = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    for (
      let t = first;
      t <= end;
      t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + stepDays)
    ) {
      if (t >= start) all.push(t.getTime())
    }
  } else {
    let month = new Date(start.getFullYear(), start.getMonth(), 1)
    if (month < start) month = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    for (let m = month; m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      all.push(m.getTime())
    }
  }

  const every = Math.max(1, Math.ceil(all.length / maxTicks))
  return all.filter((_, index) => index % every === 0)
}
