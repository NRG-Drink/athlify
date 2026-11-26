import { useGridFilter, type CustomFilterProps } from 'ag-grid-react'
import { Checklist } from '../../components/Checklist'
import type { FilterOption } from './activityFilters'
import type { ActivityRow } from './ActivitiesGridTypes'

type ActivityListFilterModel = { values: string[] }

type ActivityGridChecklistFilterProps = Pick<
  CustomFilterProps<ActivityRow, unknown, ActivityListFilterModel>,
  'model' | 'onModelChange'
> & {
  filterParams?: {
    options?: readonly FilterOption[]
    label?: string
    hasMore?: boolean
    searchable?: boolean
  }
}

export function ActivityGridChecklistFilter({
  model,
  onModelChange,
  filterParams,
}: ActivityGridChecklistFilterProps) {
  const options = filterParams?.options ?? []
  const label = filterParams?.label ?? ''
  const hasMore = filterParams?.hasMore ?? false
  const selected = model?.values ?? options.map(({ id }) => id)
  const visibleOptions = [
    ...options,
    ...selected
      .filter((id) => !options.some((option) => option.id === id))
      .map((id) => ({ id, label: id })),
  ]

  useGridFilter({ doesFilterPass: () => true })

  return (
    <Checklist
      label={label}
      options={visibleOptions}
      value={selected}
      searchable={filterParams?.searchable}
      hasMore={hasMore}
      onChange={(values) => {
        if (values.length === 0 || (!hasMore && values.length === options.length)) {
          onModelChange(null)
        } else {
          onModelChange({ values })
        }
      }}
    />
  )
}
