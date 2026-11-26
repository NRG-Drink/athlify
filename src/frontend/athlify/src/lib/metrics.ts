/** Describes one measured value; tiles, chart, table columns and form fields are all generated from these. */
export interface MetricDefinition<K extends string = string> {
  key: K
  /** i18n key of the full label, for example `bodyStats.fields.weight`. */
  labelKey: string
  unit: MetricUnit
  decimals: number
  /** Smallest accepted value (inclusive for percentages, exclusive for `exclusiveMin`). */
  min: number
  exclusiveMin?: boolean
  max?: number
}

export type MetricUnit = 'kg' | '%'

export interface MetricPoint {
  date: Date
  value: number
}

/** Ascending by date (oldest first); the input is not changed. */
export function sortByDate(points: readonly MetricPoint[]): MetricPoint[] {
  return [...points].sort((a, b) => a.date.getTime() - b.date.getTime())
}
