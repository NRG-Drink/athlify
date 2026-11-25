import { createElement, type ComponentType } from 'react'

/** Every `theme` prop AgGridReact received during the current test. */
export const seenThemes: unknown[] = []

export function recordGridThemes<T extends { AgGridReact: unknown }>(actual: T) {
  const Grid = actual.AgGridReact as ComponentType<Record<string, unknown>>
  const RecordingGrid = (props: Record<string, unknown>) => {
    seenThemes.push(props.theme)
    return createElement(Grid, props)
  }
  return { ...actual, AgGridReact: RecordingGrid }
}
