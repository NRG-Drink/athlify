import { Field, Input, InputGroup, SimpleGrid, Stack, Textarea } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '../../components/FormDialog'
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
        <Field.Root required invalid={!!errors.date}>
          <Field.Label>{t('bodyStats.fields.date')}</Field.Label>
          <Input
            type="datetime-local"
            value={values.date}
            onChange={(e) => setValues({ ...values, date: e.target.value })}
          />
          <Field.ErrorText>{errors.date}</Field.ErrorText>
        </Field.Root>

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
          {bodyStatsMetrics.map((metric) => (
            <Field.Root key={metric.key} required invalid={!!errors[metric.key]}>
              <Field.Label>{t(metric.labelKey)}</Field.Label>
              <InputGroup endElement={metric.unit}>
                {/* type="text": a number input rejects the decimal comma of German keyboards. */}
                <Input
                  type="text"
                  inputMode="decimal"
                  textAlign="end"
                  value={values[metric.key]}
                  onChange={(e) => setValues({ ...values, [metric.key]: e.target.value })}
                />
              </InputGroup>
              <Field.ErrorText>{errors[metric.key]}</Field.ErrorText>
            </Field.Root>
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
