import {
  Box,
  Button,
  Collapsible,
  Field,
  Grid,
  Input,
  NativeSelect,
  Popover,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DateField } from '../../components/DateField'
import { localDateKey } from '../../lib/period'
import { parseDate } from '../../lib/dates'
import type { EventsPageFilterControls, EventsSavedViewControls } from './useEventsPageState'
import { LuChevronRight } from 'react-icons/lu'

type EventsPageControlsProps = {
  filters: EventsPageFilterControls
  views: EventsSavedViewControls
}

type DateFilterDraft = {
  from: string
  to: string
  basedOn: string
}

function toDateFieldValue(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
}

function toDateFilterValue(value: string): string | null {
  const date = parseDate(value)
  return date ? localDateKey(date) : null
}

function isCompleteDate(value: string): boolean {
  return /^\d{1,2}\.\d{1,2}\.(?:\d{2}|\d{4})$/.test(value.trim())
}

function hasFourDigitYear(value: string): boolean {
  return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value.trim())
}

export function EventsPageControls({ filters, views }: EventsPageControlsProps) {
  const { t } = useTranslation()
  const [saveViewOpen, setSaveViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const dateFilterKey = JSON.stringify([filters.fromFilter, filters.toFilter])
  const [dateDraft, setDateDraft] = useState<DateFilterDraft>(() => ({
    from: toDateFieldValue(filters.fromFilter),
    to: toDateFieldValue(filters.toFilter),
    basedOn: dateFilterKey,
  }))
  const visibleDateDraft =
    dateDraft.basedOn === dateFilterKey
      ? dateDraft
      : {
          from: toDateFieldValue(filters.fromFilter),
          to: toDateFieldValue(filters.toFilter),
          basedOn: dateFilterKey,
        }
  const duplicateViewName = views.items.some(
    (view) => view.name.toLocaleLowerCase() === newViewName.trim().toLocaleLowerCase(),
  )
  const fromInvalid = isCompleteDate(visibleDateDraft.from) && !parseDate(visibleDateDraft.from)
  const toInvalid = isCompleteDate(visibleDateDraft.to) && !parseDate(visibleDateDraft.to)

  const updateDateDraft = (field: 'from' | 'to', value: string) => {
    setDateDraft({ ...visibleDateDraft, [field]: value, basedOn: dateFilterKey })
    const filterValue = toDateFilterValue(value)
    if (filterValue !== null && hasFourDigitYear(value)) {
      if (field === 'from') filters.onFromFilterChange(filterValue)
      else filters.onToFilterChange(filterValue)
    } else if (value.trim() === '') {
      if (field === 'from') filters.onFromFilterChange('')
      else filters.onToFilterChange('')
    }
  }

  const saveView = () => {
    views.onSave(newViewName)
    setNewViewName('')
    setSaveViewOpen(false)
  }

  return (
    <Collapsible.Root defaultOpen>
      <Box
        display="grid"
        bg="bg.panel"
        gap="2"
        borderWidth="1px"
        borderColor="border"
        borderRadius="15px"
        p={{ base: '4', md: '3' }}
      >
        <Collapsible.Trigger display="flex" gap="2" alignItems="center">
          <Collapsible.Indicator transition="transform 0.2s" _open={{ transform: 'rotate(90deg)' }}>
            <LuChevronRight />
          </Collapsible.Indicator>
          <Text>{t('events.controls.title')}</Text>
          {/* {t('events.controls.title')} */}
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box display="grid" gap="3">
            <Grid
              templateColumns={{
                base: 'repeat(2, minmax(0, 1fr))',
                md: 'minmax(12rem, 2fr) minmax(10rem, 1fr) minmax(10rem, 1fr) max-content',
              }}
              alignItems="center"
              gap="3"
            >
              <Field.Root gridColumn={{ base: '1 / -1', md: 'auto' }}>
                <Field.Label>{t('events.quickFilter')}</Field.Label>
                <Input
                  aria-label={t('events.quickFilter')}
                  value={filters.quickFilter}
                  onChange={(event) => filters.onQuickFilterChange(event.target.value)}
                />
              </Field.Root>
              <Field.Root invalid={fromInvalid}>
                <Field.Label>{t('events.fromFilter')}</Field.Label>
                <DateField
                  label={t('events.fromFilter')}
                  value={visibleDateDraft.from}
                  invalid={fromInvalid}
                  onChange={(value) => updateDateDraft('from', value)}
                />
                {fromInvalid && <Field.ErrorText>{t('events.filter.invalidDate')}</Field.ErrorText>}
              </Field.Root>
              <Field.Root invalid={toInvalid}>
                <Field.Label>{t('events.toFilter')}</Field.Label>
                <DateField
                  label={t('events.toFilter')}
                  value={visibleDateDraft.to}
                  invalid={toInvalid}
                  onChange={(value) => updateDateDraft('to', value)}
                />
                {toInvalid && <Field.ErrorText>{t('events.filter.invalidDate')}</Field.ErrorText>}
              </Field.Root>
              <Field.Root gridColumn={{ base: '1 / -1', md: 'auto' }}>
                <Field.Label>{t('events.filterActions')}</Field.Label>
                <Grid templateColumns="repeat(2, max-content)" gap="2">
                  <Button size="sm" onClick={filters.onFilterYearToDate}>
                    {t('events.filterYtd')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={filters.onResetFilters}>
                    {t('events.resetFilters')}
                  </Button>
                </Grid>
              </Field.Root>
            </Grid>

            <Grid
              templateColumns={{
                base: 'repeat(2, minmax(0, 1fr))',
                md: 'minmax(12rem, 1fr) repeat(4, max-content)',
              }}
              alignItems="center"
              gap="2"
            >
              <NativeSelect.Root gridColumn={{ base: '1 / -1', md: 'auto' }}>
                <NativeSelect.Field
                  aria-label={t('events.views.select')}
                  value={views.selectedId}
                  onChange={(event) => views.onApply(event.target.value)}
                >
                  <option value="">{t('events.views.choose')}</option>
                  {views.items.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Popover.Root
                open={saveViewOpen}
                onOpenChange={(details) => setSaveViewOpen(details.open)}
                positioning={{ placement: 'bottom-start', gutter: 8 }}
                lazyMount
                unmountOnExit
              >
                <Popover.Trigger asChild>
                  <Button size="sm" variant="outline">
                    {t('events.views.saveCurrent')}
                  </Button>
                </Popover.Trigger>
                <Portal>
                  <Popover.Positioner>
                    <Popover.Content
                      aria-label={t('events.views.saveCurrent')}
                      colorPalette="brand"
                      width="min(20rem, calc(100vw - 2rem))"
                      bg="bg.panel"
                      borderWidth="1px"
                      borderRadius="l3"
                      _dark={{ shadow: 'none' }}
                    >
                      <Popover.Header fontWeight="semibold">
                        {t('events.views.saveCurrent')}
                      </Popover.Header>
                      <Popover.Body>
                        <Stack gap="3">
                          <Input
                            aria-label={t('events.views.name')}
                            maxLength={80}
                            value={newViewName}
                            onChange={(event) => setNewViewName(event.target.value)}
                          />
                          {newViewName.trim() && duplicateViewName && (
                            <Text role="alert" color="fg.error">
                              {t('events.views.duplicateName')}
                            </Text>
                          )}
                          <Button
                            size="sm"
                            onClick={saveView}
                            disabled={
                              !newViewName.trim() ||
                              duplicateViewName ||
                              !views.canSave ||
                              fromInvalid ||
                              toInvalid
                            }
                          >
                            {t('events.views.save')}
                          </Button>
                        </Stack>
                      </Popover.Body>
                    </Popover.Content>
                  </Popover.Positioner>
                </Portal>
              </Popover.Root>
              <Button
                size="sm"
                variant="outline"
                onClick={views.onDelete}
                disabled={!views.selectedId}
              >
                {t('events.views.delete')}
              </Button>
              <Button size="sm" variant="outline" onClick={filters.onResetTable}>
                {t('events.resetTable')}
              </Button>
            </Grid>

            {views.storageFailed && (
              <Text role="alert" color="fg.error">
                {t('events.views.storageFailed')}
              </Text>
            )}
          </Box>
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  )
}
