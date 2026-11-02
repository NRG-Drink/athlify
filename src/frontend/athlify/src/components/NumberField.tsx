import { Field, Input, InputGroup } from '@chakra-ui/react'
import { normalizeDecimal } from '../lib/formValues'

export interface NumberFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  unit?: string
  required?: boolean
  error?: string
  placeholder?: string
  /** `text` for the duration: phone number pads have no colon. */
  inputMode?: 'decimal' | 'numeric' | 'text'
  /** Canonical text when the field is left; numbers by default. */
  normalize?: (raw: string) => string
}

/**
 * A number typed as text, so the decimal comma of German keyboards works, with its unit as an addon
 * beside the input and its canonical form written back when the field is left (`42,50` → `42.5`).
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  required,
  error,
  placeholder,
  inputMode = 'decimal',
  normalize = normalizeDecimal,
}: NumberFieldProps) {
  // type="text": a number input rejects the decimal comma of German keyboards.
  const input = (
    <Input
      type="text"
      inputMode={inputMode}
      textAlign="end"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        const normalized = normalize(value)
        if (normalized !== value) onChange(normalized)
      }}
    />
  )
  return (
    <Field.Root required={required} invalid={!!error}>
      <Field.Label>{label}</Field.Label>
      {/* An addon, not an overlay: an overlay is one input height wide and covers the digits of
          longer units such as "bpm". */}
      {unit ? <InputGroup endAddon={unit}>{input}</InputGroup> : input}
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  )
}
