import type { TFunction } from 'i18next'
import {
  clearNoOpGridFilters,
  createGridDateFilterParams,
  createGridTextFilterParams,
} from '../../components/ag-grid/GridFilterParams'

export { clearNoOpGridFilters }

export const createEventsTextFilterParams = (t: TFunction) =>
  createGridTextFilterParams(t, 'events')

export const createEventsDateFilterParams = (t: TFunction) =>
  createGridDateFilterParams(t, 'events')
