import { Field, Grid } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { joinDateTime, splitDateTime } from '../lib/dates'
import { DateField } from './DateField'
import { TimeField } from './TimeField'

interface DateTimeFieldProps {
  label: string
  /** `DD.MM.YYYY, HH:MM`, the form text that `parseDateTime` reads. */
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
}

/** A date with a calendar and a time with a picker side by side, under one label and error. */
export function DateTimeField({ label, value, onChange, error, required }: DateTimeFieldProps) {
  const { t } = useTranslation()
  const [date, time] = splitDateTime(value)

  return (
    <Field.Root required={required} invalid={!!error}>
      <Field.Label>{label}</Field.Label>
      <Grid templateColumns="minmax(0, 3fr) minmax(0, 2fr)" gap="2" width="full">
        <DateField
          label={t('form.date')}
          value={date}
          onChange={(next) => onChange(joinDateTime(next, time))}
          invalid={!!error}
          portalled={false}
        />
        <TimeField
          label={t('form.time')}
          value={time}
          onChange={(next) => onChange(joinDateTime(date, next))}
          invalid={!!error}
        />
      </Grid>
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  )
}
