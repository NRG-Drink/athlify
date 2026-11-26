import {
  Box,
  Button,
  Collapsible,
  Field,
  Flex,
  Grid,
  Input,
  NativeSelect,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuChevronRight } from 'react-icons/lu'
import type { ChecklistOption } from '../../components/Checklist'
import { DateField } from '../../components/DateField'
import { groupings } from '../../lib/aggregate'
import { parseDate } from '../../lib/dates'
import { localDateKey, periods } from '../../lib/period'
import { toggleId } from '../../lib/ids'
import type { DashboardView } from './dashboardPreferences'
import { ALL_SINCE, type DashboardState, type DashboardStateActions } from './useDashboardPageState'

interface DashboardFiltersProps {
  state: DashboardState & DashboardStateActions
  tags: readonly ChecklistOption[]
  hasMoreTags: boolean
  views: readonly DashboardView[]
  viewsStorageFailed: boolean
  onSaveView: (name: string, search: string) => void
  onDeleteView: (id: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toFieldValue(key: string): string {
  if (key === ALL_SINCE) return ''
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
}

const isCompleteDate = (value: string) => /^\d{1,2}\.\d{1,2}\.(?:\d{2}|\d{4})$/.test(value.trim())
const hasFourDigitYear = (value: string) => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value.trim())

interface RangeFieldProps {
  label: string
  committed: string
  onCommit: (key: string) => void
}

/** A date field that keeps the typed text and commits to the URL once it is a full valid date. */
function RangeField({ label, committed, onCommit }: RangeFieldProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<{ text: string; basedOn: string }>({
    text: toFieldValue(committed),
    basedOn: committed,
  })
  const text = draft.basedOn === committed ? draft.text : toFieldValue(committed)
  const invalid = isCompleteDate(text) && !parseDate(text)

  const change = (value: string) => {
    setDraft({ text: value, basedOn: committed })
    const date = parseDate(value)
    if (date && hasFourDigitYear(value)) onCommit(localDateKey(date))
  }

  return (
    <Field.Root invalid={invalid}>
      <Field.Label>{label}</Field.Label>
      <DateField label={label} value={text} invalid={invalid} onChange={change} />
      {invalid && <Field.ErrorText>{t('dashboard.filters.invalidDate')}</Field.ErrorText>}
    </Field.Root>
  )
}

/** The dashboard's filters: preset, period, activity type, tags and grouping. */
export function DashboardFilters({
  state,
  tags,
  hasMoreTags,
  views,
  viewsStorageFailed,
  onSaveView,
  onDeleteView,
  open,
  onOpenChange,
}: DashboardFiltersProps) {
  const { t } = useTranslation()
  const [newViewName, setNewViewName] = useState('')
  const selectedView = views.find((view) => view.search === state.search)
  const trimmedName = newViewName.trim()
  const duplicateName = views.some(
    (view) => view.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  )

  const saveView = () => {
    onSaveView(trimmedName, state.search)
    setNewViewName('')
  }

  return (
    <Collapsible.Root open={open} onOpenChange={(details) => onOpenChange(details.open)}>
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
          <Text>{t('dashboard.filters.title')}</Text>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Stack gap="4">
            <Grid
              templateColumns={{ base: '1fr', md: 'minmax(12rem, 2fr) repeat(2, max-content)' }}
              alignItems="end"
              gap="2"
            >
              <NativeSelect.Root>
                <NativeSelect.Field
                  aria-label={t('dashboard.filters.preset')}
                  value={selectedView?.id ?? ''}
                  onChange={(event) => {
                    const view = views.find((item) => item.id === event.target.value)
                    if (view) state.applySearch(view.search)
                  }}
                >
                  <option value="">{t('dashboard.filters.presetChoose')}</option>
                  {views.map(({ id, name }) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedView}
                onClick={() => selectedView && onDeleteView(selectedView.id)}
              >
                {t('dashboard.filters.presetDelete')}
              </Button>
              <Button size="sm" variant="outline" onClick={state.reset}>
                {t('dashboard.filters.reset')}
              </Button>
            </Grid>
            <Flex gap="2" align="center">
              <Input
                size="sm"
                maxLength={80}
                aria-label={t('dashboard.filters.presetName')}
                placeholder={t('dashboard.filters.presetName')}
                value={newViewName}
                onChange={(event) => setNewViewName(event.target.value)}
              />
              <Button size="sm" disabled={!trimmedName || duplicateName} onClick={saveView}>
                {t('dashboard.filters.presetSave')}
              </Button>
            </Flex>
            {trimmedName && duplicateName && (
              <Text role="alert" color="fg.error">
                {t('dashboard.filters.presetDuplicate')}
              </Text>
            )}
            {viewsStorageFailed && (
              <Text role="alert" color="fg.error">
                {t('dashboard.filters.presetStorageFailed')}
              </Text>
            )}

            <Stack gap="2">
              <Flex role="group" aria-label={t('dashboard.filters.period')} wrap="wrap" gap="2">
                {periods.map((period) => (
                  <Button
                    key={period}
                    size="sm"
                    variant={state.period === period ? 'solid' : 'outline'}
                    aria-pressed={state.period === period}
                    onClick={() => state.setPeriod(period)}
                  >
                    {t(`dashboard.filters.periods.${period}`)}
                  </Button>
                ))}
              </Flex>
              <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap="3" maxW="md">
                <RangeField
                  label={t('dashboard.filters.from')}
                  committed={state.range.from}
                  onCommit={state.setFrom}
                />
                <RangeField
                  label={t('dashboard.filters.to')}
                  committed={state.range.to}
                  onCommit={state.setTo}
                />
              </Grid>
            </Stack>

            <Stack gap="2">
              <Text textStyle="kicker" color="fg.muted">
                {t('dashboard.filters.type')}
              </Text>
              <Flex role="group" aria-label={t('dashboard.filters.type')} wrap="wrap" gap="2">
                <Button
                  size="sm"
                  variant={state.indoor ? 'solid' : 'outline'}
                  aria-pressed={state.indoor}
                  onClick={() => state.setIndoor(!state.indoor)}
                >
                  {t('dashboard.filters.indoor')}
                </Button>
                <Button
                  size="sm"
                  variant={state.outdoor ? 'solid' : 'outline'}
                  aria-pressed={state.outdoor}
                  onClick={() => state.setOutdoor(!state.outdoor)}
                >
                  {t('dashboard.filters.outdoor')}
                </Button>
              </Flex>
            </Stack>

            {tags.length > 0 && (
              <Stack gap="2">
                <Text textStyle="kicker" color="fg.muted">
                  {t('dashboard.filters.tags')}
                </Text>
                <Flex role="group" aria-label={t('dashboard.filters.tags')} wrap="wrap" gap="2">
                  {tags.map(({ id, label }) => {
                    const selected = state.filters.tagIds?.includes(id) ?? false
                    return (
                      <Button
                        key={id}
                        size="xs"
                        variant={selected ? 'solid' : 'outline'}
                        aria-pressed={selected}
                        onClick={() => state.setTagIds(toggleId(state.filters.tagIds ?? [], id))}
                      >
                        {label}
                      </Button>
                    )
                  })}
                </Flex>
                {hasMoreTags && (
                  <Text fontSize="sm" color="fg.muted">
                    {t('checklist.moreOptions')}
                  </Text>
                )}
              </Stack>
            )}

            <Stack gap="2">
              <Text textStyle="kicker" color="fg.muted">
                {t('dashboard.filters.grouping')}
              </Text>
              <Flex role="group" aria-label={t('dashboard.filters.grouping')} wrap="wrap" gap="2">
                {groupings.map((grouping) => (
                  <Button
                    key={grouping}
                    size="sm"
                    variant={state.grouping === grouping ? 'solid' : 'outline'}
                    aria-pressed={state.grouping === grouping}
                    onClick={() => state.setGrouping(grouping)}
                  >
                    {t(`dashboard.grouping.${grouping}`)}
                  </Button>
                ))}
              </Flex>
            </Stack>
          </Stack>
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  )
}
