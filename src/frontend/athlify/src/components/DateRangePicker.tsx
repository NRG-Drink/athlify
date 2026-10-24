import {
  Button,
  Field,
  Grid,
  Input,
  Popover,
  Portal,
  Stack,
  Text,
  NativeSelect,
} from '@chakra-ui/react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LuCalendarDays } from 'react-icons/lu'
import { useFormat } from '../i18n/useFormat'
import {
  aggregations,
  dateFromKey,
  parseAggregation,
  validateDateRange,
  type Aggregation,
  type DateRange,
} from '../lib/period'

export interface DateRangeSelection {
  range: DateRange
  aggregation: Aggregation
}

export interface DateRangePickerProps {
  value: DateRangeSelection
  onChange: (selection: DateRangeSelection) => void
  min?: string
  max?: string
}

export function DateRangePicker({ value, onChange, min, max }: DateRangePickerProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string | undefined>()
  const [shownValue, setShownValue] = useState(value)
  if (
    shownValue.range.from !== value.range.from ||
    shownValue.range.to !== value.range.to ||
    shownValue.aggregation !== value.aggregation
  ) {
    setShownValue(value)
    setDraft(value)
    setError(undefined)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateDateRange(draft.range.from, draft.range.to)
    if (!result.valid) {
      setError(t(`bodyStats.range.errors.${result.error}`))
      return
    }
    setError(undefined)
    onChange({ range: result.range, aggregation: draft.aggregation })
    setOpen(false)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open)
        if (details.open) {
          setDraft(value)
          setError(undefined)
        }
      }}
      positioning={{ placement: 'bottom-end', gutter: 8 }}
    >
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          justifyContent="flex-start"
          textAlign="start"
          aria-label={t('bodyStats.range.changeLabel', {
            summary: t('bodyStats.range.summary', {
              from: format.date(dateFromKey(value.range.from)),
              to: format.date(dateFromKey(value.range.to)),
              aggregation: t(`bodyStats.range.aggregations.${value.aggregation}`),
            }),
          })}
        >
          <LuCalendarDays aria-hidden />
          <Text as="span" color="fg.muted" fontWeight="normal">
            {t('bodyStats.range.summary', {
              from: format.date(dateFromKey(value.range.from)),
              to: format.date(dateFromKey(value.range.to)),
              aggregation: t(`bodyStats.range.aggregations.${value.aggregation}`),
            })}
          </Text>
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            width={{ base: 'calc(100vw - 2rem)', sm: 'md' }}
            maxWidth="calc(100vw - 2rem)"
            bg="bg.panel"
            borderWidth="1px"
            borderRadius="l3"
            _dark={{ shadow: 'none' }}
          >
            <Popover.Body p={{ base: '4', sm: '5' }}>
              <form onSubmit={submit} aria-label={t('bodyStats.range.label')}>
                <Stack gap="4">
                  <Grid columns={{ base: 1, sm: 2 }} gap="3">
                    <Field.Root required invalid={!!error}>
                      <Field.Label>{t('bodyStats.range.from')}</Field.Label>
                      <Input
                        type="date"
                        value={draft.range.from}
                        min={min}
                        max={max}
                        aria-describedby={error ? 'body-stats-range-error' : undefined}
                        onChange={(event) =>
                          setDraft({ ...draft, range: { ...draft.range, from: event.target.value } })
                        }
                      />
                    </Field.Root>
                    <Field.Root required invalid={!!error}>
                      <Field.Label>{t('bodyStats.range.to')}</Field.Label>
                      <Input
                        type="date"
                        value={draft.range.to}
                        min={min}
                        max={max}
                        aria-describedby={error ? 'body-stats-range-error' : undefined}
                        onChange={(event) =>
                          setDraft({ ...draft, range: { ...draft.range, to: event.target.value } })
                        }
                      />
                    </Field.Root>
                  </Grid>
                  <Field.Root>
                    <Field.Label>{t('bodyStats.range.aggregation')}</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={draft.aggregation}
                        aria-label={t('bodyStats.range.aggregation')}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            aggregation: parseAggregation(event.target.value),
                          })
                        }
                      >
                        {aggregations.map((aggregation) => (
                          <option key={aggregation} value={aggregation}>
                            {t(`bodyStats.range.aggregations.${aggregation}`)}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                  {error && (
                    <Field.Root invalid>
                      <Field.ErrorText id="body-stats-range-error" role="alert">
                        {error}
                      </Field.ErrorText>
                    </Field.Root>
                  )}
                  <Stack direction={{ base: 'column-reverse', sm: 'row' }} gap="2" justify="end">
                    <Popover.CloseTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setDraft(value)
                          setError(undefined)
                        }}
                      >
                        {t('bodyStats.range.cancel')}
                      </Button>
                    </Popover.CloseTrigger>
                    <Button type="submit">{t('bodyStats.range.apply')}</Button>
                  </Stack>
                </Stack>
              </form>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
