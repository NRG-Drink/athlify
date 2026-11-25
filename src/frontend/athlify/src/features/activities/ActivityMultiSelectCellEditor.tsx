import { NativeSelect } from '@chakra-ui/react'
import type { CustomCellEditorProps } from 'ag-grid-react'
import { useEffect, useRef } from 'react'
import type { FilterOption } from './activityFilters'
import type { ActivityRow } from './ActivitiesTable'

type Props = CustomCellEditorProps<ActivityRow, string[]> & {
  options: readonly FilterOption[]
  label: string
}

export function ActivityMultiSelectCellEditor({ value, onValueChange, options, label }: Props) {
  const selectRef = useRef<HTMLSelectElement>(null)
  useEffect(() => selectRef.current?.focus(), [])

  return (
    <NativeSelect.Root>
      <NativeSelect.Field
        ref={selectRef}
        aria-label={label}
        multiple
        value={value ?? []}
        onChange={(event) => {
          onValueChange(Array.from(event.currentTarget.selectedOptions, ({ value: id }) => id))
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {options.map(({ id, label: optionLabel }) => (
          <option key={id} value={id}>
            {optionLabel}
          </option>
        ))}
      </NativeSelect.Field>
    </NativeSelect.Root>
  )
}
