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

const noFilterOption = {
  displayKey: 'none',
  numberOfInputs: 0,
  hideFilterInput: true,
  predicate: () => true,
}

export function createEventsTextFilterParams(t: TFunction) {
  return {
    filterOptions: [
      { ...noFilterOption, displayName: t('events.gridFilter.none') },
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

export function createEventsDateFilterParams(t: TFunction) {
  return {
    filterOptions: [
      { ...noFilterOption, displayName: t('events.gridFilter.none') },
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
