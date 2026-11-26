import type { TFunction } from 'i18next'

export async function clearNoOpGridFilters(
  filterModel: Record<string, unknown>,
  clearFilter: (column: string) => Promise<void>,
  notifyFilterChanged: () => void,
): Promise<boolean> {
  const noOpColumns = Object.entries(filterModel).flatMap(([column, model]) =>
    typeof model === 'object' &&
    model !== null &&
    'type' in model &&
    model.type === 'none'
      ? [column]
      : [],
  )
  if (noOpColumns.length === 0) return false

  await Promise.all(noOpColumns.map(clearFilter))
  notifyFilterChanged()
  return true
}

type GridFilterNamespace = 'activities' | 'events'

const noFilterOption = (displayName: string) => ({
  displayKey: 'none',
  displayName,
  numberOfInputs: 0,
  hideFilterInput: true,
  predicate: () => true,
})

export function createGridTextFilterParams(t: TFunction, namespace: GridFilterNamespace) {
  return {
    filterOptions: [
      noFilterOption(t(`${namespace}.gridFilter.none`)),
      'equals',
      'notEqual',
      'contains',
      'notContains',
      'startsWith',
      'endsWith',
      'blank',
      'notBlank',
    ],
    defaultOption: 'none',
    maxNumConditions: 1,
  }
}

export function createGridDateFilterParams(t: TFunction, namespace: GridFilterNamespace) {
  return {
    filterOptions: [
      noFilterOption(t(`${namespace}.gridFilter.none`)),
      'equals',
      'notEqual',
      'lessThan',
      'greaterThan',
      'inRange',
      'blank',
      'notBlank',
    ],
    defaultOption: 'none',
    maxNumConditions: 1,
  }
}

export function createGridNumberFilterParams(t: TFunction, namespace: GridFilterNamespace) {
  return {
    filterOptions: [
      noFilterOption(t(`${namespace}.gridFilter.none`)),
      'equals',
      'notEqual',
      'lessThan',
      'greaterThan',
      'inRange',
      'blank',
      'notBlank',
    ],
    defaultOption: 'none',
    maxNumConditions: 1,
  }
}
