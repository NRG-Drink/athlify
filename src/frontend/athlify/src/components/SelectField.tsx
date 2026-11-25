import { Field, NativeSelect } from '@chakra-ui/react'
import type { ChecklistOption } from './Checklist'

interface SelectProps<T extends string> {
  label: string
  value: T | ''
  onChange: (value: T | '') => void
  /** Label of the empty choice; without it a value is required. */
  emptyLabel?: string
  options: readonly (ChecklistOption & { id: T })[]
  error?: string
  disabled?: boolean
}

/** A labelled native select over a closed set of values; '' is the empty choice when `emptyLabel` is set. */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  emptyLabel,
  options,
  error,
  disabled,
}: SelectProps<T>) {
  return (
    <Field.Root invalid={!!error} required={emptyLabel === undefined} disabled={disabled}>
      <Field.Label>{label}</Field.Label>
      <NativeSelect.Root>
        {/* The options are exactly the values of T, and '' only when emptyLabel offers it. */}
        <NativeSelect.Field
          value={value}
          onChange={(event) => onChange(event.target.value as T | '')}
        >
          {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  )
}
