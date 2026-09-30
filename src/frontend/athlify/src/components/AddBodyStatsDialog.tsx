import {
  Button,
  CloseButton,
  Dialog,
  Field,
  Input,
  Portal,
  SimpleGrid,
  Stack,
} from '@chakra-ui/react'
import { useState, type SubmitEventHandler } from 'react'
import { graphql, useMutation } from 'react-relay'
import { useTranslation } from 'react-i18next'
import type { BodyStatsEntry } from './bodyStatsTypes'
import { toaster } from './ui/toaster'
import type { AddBodyStatsDialogMutation } from './__generated__/AddBodyStatsDialogMutation.graphql'

const addBodyStatsMutation = graphql`
  mutation AddBodyStatsDialogMutation($bodyStats: BodyStatsDtoInput!) {
    addBodyStats(bodyStats: $bodyStats) {
      uid
      date
      weight
      bodyFatPercentage
      musclePercentage
      waterPercentage
      boneMass
    }
  }
`

type NumericField =
  'weight' | 'bodyFatPercentage' | 'musclePercentage' | 'waterPercentage' | 'boneMass'

const numericFields: { name: NumericField; max?: number; step: string }[] = [
  { name: 'weight', step: '0.1' },
  { name: 'bodyFatPercentage', max: 100, step: '0.1' },
  { name: 'musclePercentage', max: 100, step: '0.1' },
  { name: 'waterPercentage', max: 100, step: '0.1' },
  { name: 'boneMass', step: '0.1' },
]

type FormValues = Record<NumericField, string> & { date: string }

const today = () => new Date().toISOString().slice(0, 10)

const initialValues = (latest?: BodyStatsEntry): FormValues => ({
  date: today(),
  weight: latest ? String(latest.weight) : '',
  bodyFatPercentage: latest ? String(latest.bodyFatPercentage) : '',
  musclePercentage: latest ? String(latest.musclePercentage) : '',
  waterPercentage: latest ? String(latest.waterPercentage) : '',
  boneMass: latest ? String(latest.boneMass) : '',
})

export interface AddBodyStatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  /** Most recent entry; its measurements prefill the form each time the dialog opens. */
  latest?: BodyStatsEntry
}

export function AddBodyStatsDialog({
  open,
  onOpenChange,
  onCreated,
  latest,
}: AddBodyStatsDialogProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<FormValues>(() => initialValues(latest))
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [commit, isInFlight] = useMutation<AddBodyStatsDialogMutation>(addBodyStatsMutation)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setValues(initialValues(latest))
      setErrors({})
    }
  }

  const close = (next: boolean) => onOpenChange(next)

  const validate = () => {
    const found: Partial<Record<keyof FormValues, string>> = {}
    if (!values.date) found.date = t('bodyStats.add.errors.required')
    for (const { name, max } of numericFields) {
      const raw = values[name].trim()
      const value = Number(raw)
      if (raw === '') found[name] = t('bodyStats.add.errors.required')
      else if (!Number.isFinite(value) || value < 0 || (max !== undefined && value > max))
        found[name] = t('bodyStats.add.errors.range', { max: max ?? '' })
    }
    setErrors(found)
    return Object.keys(found).length === 0
  }

  const showError = () => {
    toaster.create({ type: 'error', title: t('bodyStats.add.errors.saveFailed') })
  }

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    if (!validate()) return

    commit({
      variables: {
        bodyStats: {
          date: new Date(`${values.date}T00:00:00Z`).toISOString(),
          weight: Number(values.weight),
          bodyFatPercentage: Number(values.bodyFatPercentage),
          musclePercentage: Number(values.musclePercentage),
          waterPercentage: Number(values.waterPercentage),
          boneMass: Number(values.boneMass),
          comments: [],
        },
      },
      onCompleted: (_response, graphQlErrors) => {
        if (graphQlErrors?.length) {
          showError()
          return
        }
        toaster.create({ type: 'success', title: t('bodyStats.add.success') })
        close(false)
        onCreated()
      },
      onError: showError,
    })
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => close(details.open)}
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <form onSubmit={onSubmit} noValidate>
              <Dialog.Header>
                <Dialog.Title>{t('bodyStats.add.title')}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <Field.Root required invalid={!!errors.date}>
                    <Field.Label>{t('bodyStats.fields.date')}</Field.Label>
                    <Input
                      type="date"
                      value={values.date}
                      onChange={(e) => setValues({ ...values, date: e.target.value })}
                    />
                    <Field.ErrorText>{errors.date}</Field.ErrorText>
                  </Field.Root>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
                    {numericFields.map(({ name, max, step }) => (
                      <Field.Root key={name} required invalid={!!errors[name]}>
                        <Field.Label>{t(`bodyStats.fields.${name}`)}</Field.Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={max}
                          step={step}
                          value={values[name]}
                          onChange={(e) => setValues({ ...values, [name]: e.target.value })}
                        />
                        <Field.ErrorText>{errors[name]}</Field.ErrorText>
                      </Field.Root>
                    ))}
                  </SimpleGrid>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" disabled={isInFlight}>
                    {t('bodyStats.add.cancel')}
                  </Button>
                </Dialog.ActionTrigger>
                <Button type="submit" loading={isInFlight}>
                  {t('bodyStats.add.save')}
                </Button>
              </Dialog.Footer>
            </form>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" aria-label={t('bodyStats.add.cancel')} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
