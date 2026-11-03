import { Field, SimpleGrid, Stack, Textarea } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DateTimeField } from '../../components/DateTimeField'
import { FormDialog } from '../../components/FormDialog'
import { NumberField } from '../../components/NumberField'
import {
  MAX_NOTE_LENGTH,
  toInput,
  validate,
  type BodyStatsFormErrors,
  type BodyStatsFormValues,
} from './bodyStatsForm'
import { bodyStatsMetrics } from './bodyStatsMetrics'
import type { BodyStatsInput } from './useBodyStatsMutations'

export interface BodyStatsFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `edit` changes the title; the values decide what is shown. */
  mode: 'create' | 'edit'
  /** Values the form shows each time it opens. */
  initialValues: BodyStatsFormValues
  busy: boolean
  onSave: (input: BodyStatsInput) => void
}

export function BodyStatsFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  busy,
  onSave,
}: BodyStatsFormDialogProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<BodyStatsFormErrors>({})

  // Reset the form every time the dialog opens, from the values of that moment.
  // The mode is kept as well, so the title does not change while the dialog fades out.
  const [wasOpen, setWasOpen] = useState(open)
  const [shownMode, setShownMode] = useState(mode)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setShownMode(mode)
      setValues(initialValues)
      setErrors({})
    }
  }

  const submit = () => {
    const found = validate(values, t)
    setErrors(found)
    if (Object.keys(found).length === 0) onSave(toInput(values))
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(shownMode === 'create' ? 'bodyStats.add.title' : 'bodyStats.edit.title')}
      submitLabel={t('form.save')}
      busy={busy}
      onSubmit={submit}
    >
      <Stack gap="4">
        <DateTimeField
          label={t('bodyStats.fields.date')}
          value={values.date}
          onChange={(date) => setValues({ ...values, date })}
          error={errors.date}
          required
        />

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
          {bodyStatsMetrics.map((metric) => (
            <NumberField
              key={metric.key}
              label={t(metric.labelKey)}
              value={values[metric.key]}
              onChange={(value) => setValues((current) => ({ ...current, [metric.key]: value }))}
              unit={metric.unit}
              required
              error={errors[metric.key]}
            />
          ))}
        </SimpleGrid>

        <Field.Root>
          <Field.Label>{t('bodyStats.fields.note')}</Field.Label>
          <Textarea
            autoresize
            rows={3}
            maxLength={MAX_NOTE_LENGTH}
            value={values.note}
            onChange={(e) => setValues({ ...values, note: e.target.value })}
          />
        </Field.Root>
      </Stack>
    </FormDialog>
  )
}
