import type { TFunction } from 'i18next'
import {
  clearNoOpGridFilters,
  createGridDateFilterParams,
  createGridNumberFilterParams,
  createGridTextFilterParams,
} from '../../components/ag-grid/GridFilterParams'

export { clearNoOpGridFilters }

const requiredValueOptions = (options: ReadonlyArray<unknown>) =>
  options.filter((option) => option !== 'blank' && option !== 'notBlank')

export const createBodyStatsTextFilterParams = (t: TFunction) =>
  createGridTextFilterParams(t, 'bodyStats')

export const createBodyStatsDateFilterParams = (t: TFunction) => {
  const params = createGridDateFilterParams(t, 'bodyStats')
  return { ...params, filterOptions: requiredValueOptions(params.filterOptions) }
}

const isEqualityOption = (option: unknown) =>
  option === 'equals' ||
  option === 'notEqual' ||
  (typeof option === 'object' && option !== null && 'displayKey' in option && option.displayKey === 'none')

export const createBodyStatsIdFilterParams = (t: TFunction) => {
  const params = createGridNumberFilterParams(t, 'bodyStats')
  return { ...params, filterOptions: params.filterOptions.filter(isEqualityOption) }
}

export const createBodyStatsNumberFilterParams = (t: TFunction) => {
  const params = createGridNumberFilterParams(t, 'bodyStats')
  return { ...params, filterOptions: requiredValueOptions(params.filterOptions) }
}
