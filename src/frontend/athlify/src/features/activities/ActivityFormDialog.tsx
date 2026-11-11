import {
  Box,
  Button,
  Collapsible,
  Field,
  Fieldset,
  Grid,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuChevronRight } from 'react-icons/lu'
import { DateTimeField } from '../../components/DateTimeField'
import { FormDialog } from '../../components/FormDialog'
import { NumberField } from '../../components/NumberField'
import { useFormat } from '../../i18n/useFormat'
import {
  countDetails,
  detailFields,
  heartRateFields,
  MAX_DESCRIPTION_LENGTH,
  normalizeDuration,
  toInput,
  validate,
  type ActivityFormErrors,
  type ActivityFormInput,
  type ActivityFormValues,
} from './activityForm'
import { activityTypes, moods, winds, type FilterOption } from './activityFilters'
import {
  emojiOptions,
  enumLabel,
  enumOptions,
  formatOptionalNumber,
  moodEmoji,
  tagColorPalette,
  windEmoji,
} from './activityFormatting'
import { ChipChoice, EffortSlider, EmojiChoice, SectionLegend } from './ActivityFormFields'

/** The choices of the form; they include the bicycle, gadgets and tags of the activity being edited. */
export interface ActivityFormOptions {
  vehicles: readonly FilterOption[]
  gadgets: readonly FilterOption[]
  tags: readonly FilterOption[]
  hasMoreGadgets: boolean
  hasMoreTags: boolean
}

/** Calculated and system values, shown read-only when an existing activity is edited. */
export interface ActivityCalculatedValues {
  averageSpeed: number | null | undefined
  tss: number | null | undefined
  source: string
}

export interface ActivityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sets the title; when editing, "More details" opens if it holds values. */
  mode: 'create' | 'duplicate' | 'edit'
  /** Values the form shows each time it opens. */
  initialValues: ActivityFormValues
  /** Only when editing. */
  calculated?: ActivityCalculatedValues
  options: ActivityFormOptions
  busy: boolean
  onSave: (input: ActivityFormInput) => void
  /** Creates a tag and calls `onCreated` with its id. */
  onCreateTag: (name: string, onCreated: (id: string) => void) => void
  creatingTag: boolean
}

const titleKey = {
  create: 'activities.add.title',
  duplicate: 'activities.duplicate.title',
  edit: 'activities.edit.title',
} as const

interface SelectProps<T extends string> {
  label: string
  value: T | ''
  onChange: (value: T | '') => void
  /** Label of the empty choice; without it a value is required. */
  emptyLabel?: string
  options: readonly (FilterOption & { id: T })[]
  error?: string
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  emptyLabel,
  options,
  error,
}: SelectProps<T>) {
  return (
    <Field.Root invalid={!!error} required={emptyLabel === undefined}>
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

export function ActivityFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  calculated,
  options,
  busy,
  onSave,
  onCreateTag,
  creatingTag,
}: ActivityFormDialogProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<ActivityFormErrors>({})
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Reset the form every time the dialog opens, from the values of that moment. Mode and calculated
  // values are kept as well, so the dialog does not change while it fades out.
  const [wasOpen, setWasOpen] = useState(open)
  const [shown, setShown] = useState({ mode, calculated })
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setShown({ mode, calculated })
      setValues(initialValues)
      setErrors({})
      setDetailsOpen(mode === 'edit' && countDetails(initialValues) > 0)
    }
  }

  // Stable, so the memoized detail fields only render again when their own value changes.
  const set = useCallback(
    <K extends keyof ActivityFormValues>(key: K, value: ActivityFormValues[K]) =>
      setValues((current) => ({ ...current, [key]: value })),
    [],
  )
  const setEffort = useCallback((value: string) => set('effort', value), [set])
  const setMood = useCallback((value: ActivityFormValues['mood']) => set('mood', value), [set])
  const setWind = useCallback((value: ActivityFormValues['wind']) => set('wind', value), [set])
  const setGadgets = useCallback((ids: string[]) => set('gadgetIds', ids), [set])
  const setTags = useCallback((ids: string[]) => set('tagIds', ids), [set])
  const moodOptions = useMemo(() => emojiOptions(t, 'moods', moods, moodEmoji), [t])
  const windOptions = useMemo(() => emojiOptions(t, 'winds', winds, windEmoji), [t])

  const submit = () => {
    const found = validate(values, t)
    setErrors(found)
    if (Object.keys(found).length === 0) onSave(toInput(values))
    // An error inside the folded details must not stay hidden.
    else if (detailFields.some((field) => found[field])) setDetailsOpen(true)
  }

  /** An existing tag of that name is ticked instead of being created twice. */
  const tagCreate = useMemo(
    () => ({
      creating: creatingTag,
      onCreate: (name: string, clear: () => void) => {
        const tick = (id: string) => {
          setValues((current) =>
            current.tagIds.includes(id) ? current : { ...current, tagIds: [...current.tagIds, id] },
          )
          clear()
        }
        const existing = options.tags.find(
          (tag) => tag.label.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0,
        )
        if (existing) tick(existing.id)
        else onCreateTag(name, tick)
      },
    }),
    [creatingTag, options.tags, onCreateTag],
  )

  const unit = (key: string) => t(`activities.units.${key}`)
  const filledDetails = countDetails(values)
  const calculatedRows = (calculated: ActivityCalculatedValues) => [
    [
      t('activities.columns.speed'),
      calculated.averageSpeed == null
        ? '—'
        : `${formatOptionalNumber(format, calculated.averageSpeed, 1)} ${unit('speed')}`,
    ],
    [t('activities.columns.tss'), formatOptionalNumber(format, calculated.tss, 0)],
    [t('activities.form.source'), enumLabel(t, 'sources', calculated.source)],
  ]

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(titleKey[shown.mode])}
      submitLabel={t('form.save')}
      busy={busy}
      onSubmit={submit}
      size="lg"
    >
      <Stack gap="6">
        <Stack gap="4">
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
            <DateTimeField
              label={t('activities.form.date')}
              value={values.date}
              onChange={(value) => set('date', value)}
              error={errors.date}
              required
            />
            <SelectField
              label={t('activities.columns.type')}
              value={values.type}
              onChange={(value) => value && set('type', value)}
              options={enumOptions(t, 'types', activityTypes)}
            />
          </SimpleGrid>
          <SimpleGrid columns={{ base: 2, sm: 3 }} gap="4">
            <NumberField
              label={t('activities.columns.duration')}
              value={values.duration}
              onChange={(value) => set('duration', value)}
              unit={unit('duration')}
              required
              error={errors.duration}
              placeholder={t('activities.form.durationPlaceholder')}
              inputMode="text"
              normalize={normalizeDuration}
            />
            <NumberField
              label={t('activities.columns.distance')}
              value={values.distance}
              onChange={(value) => set('distance', value)}
              unit={unit('distance')}
              required
              error={errors.distance}
            />
            <NumberField
              label={t('activities.columns.elevationGain')}
              value={values.elevationGain}
              onChange={(value) => set('elevationGain', value)}
              unit={unit('elevation')}
              error={errors.elevationGain}
              inputMode="numeric"
            />
          </SimpleGrid>
          <SelectField
            label={t('activities.columns.vehicle')}
            value={values.vehicleId}
            onChange={(value) => set('vehicleId', value)}
            emptyLabel={t('activities.form.noVehicle')}
            options={options.vehicles}
          />
          <Field.Root invalid={!!errors.description}>
            <Field.Label>{t('activities.columns.description')}</Field.Label>
            <Textarea
              autoresize
              rows={2}
              maxLength={MAX_DESCRIPTION_LENGTH}
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
            />
            <Field.ErrorText>{errors.description}</Field.ErrorText>
          </Field.Root>
        </Stack>

        <Collapsible.Root
          lazyMount
          open={detailsOpen}
          onOpenChange={(details) => setDetailsOpen(details.open)}
        >
          <Collapsible.Trigger asChild>
            <Button variant="ghost" size="sm" alignSelf="flex-start" px="2">
              <Box
                as="span"
                display="inline-flex"
                transform={detailsOpen ? 'rotate(90deg)' : undefined}
                transition="transform 0.15s ease-out"
                _motionReduce={{ transition: 'none' }}
              >
                <LuChevronRight aria-hidden />
              </Box>
              {t('activities.form.moreDetails')}
              {/* While folded, the count tells that values are hidden here. */}
              {!detailsOpen && filledDetails > 0 && (
                <Text as="span" color="fg.muted" fontWeight="normal">
                  · {t('activities.form.detailsCount', { count: filledDetails })}
                </Text>
              )}
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Stack gap="4" pt="4">
              <Fieldset.Root>
                <SectionLegend>
                  {t('activities.form.heartRate', { unit: unit('heartRate') })}
                </SectionLegend>
                <SimpleGrid columns={3} gap="4">
                  {heartRateFields.map((field) => (
                    <NumberField
                      key={field}
                      label={t(`activities.form.${field}`)}
                      value={values[field]}
                      onChange={(value) => set(field, value)}
                      error={errors[field]}
                      inputMode="numeric"
                    />
                  ))}
                </SimpleGrid>
              </Fieldset.Root>
              <EffortSlider
                label={t('activities.columns.effort')}
                value={values.effort}
                onChange={setEffort}
                error={errors.effort}
              />
              <EmojiChoice
                label={t('activities.columns.mood')}
                value={values.mood}
                onChange={setMood}
                options={moodOptions}
              />
              <EmojiChoice
                label={t('activities.columns.wind')}
                value={values.wind}
                onChange={setWind}
                options={windOptions}
              />
              <ChipChoice
                label={t('activities.columns.gadgets')}
                options={options.gadgets}
                value={values.gadgetIds}
                onChange={setGadgets}
                hasMore={options.hasMoreGadgets}
                emptyText={t('activities.form.noGadgets')}
              />
              <ChipChoice
                label={t('activities.columns.tags')}
                options={options.tags}
                value={values.tagIds}
                onChange={setTags}
                hasMore={options.hasMoreTags}
                colorOf={tagColorPalette}
                create={tagCreate}
              />
            </Stack>
          </Collapsible.Content>
        </Collapsible.Root>

        {shown.calculated && (
          <Stack gap="2">
            <Text textStyle="kicker" color="fg.muted">
              {t('activities.form.calculated')}
            </Text>
            <Grid
              as="dl"
              templateColumns="max-content 1fr"
              columnGap="4"
              rowGap="1"
              fontSize="sm"
              fontVariantNumeric="tabular-nums"
            >
              {calculatedRows(shown.calculated).map(([label, value]) => (
                <Fragment key={label}>
                  <Text as="dt" color="fg.muted">
                    {label}*
                  </Text>
                  <Text as="dd">{value}</Text>
                </Fragment>
              ))}
            </Grid>
            <Text fontSize="sm" color="fg.muted">
              {t('activities.form.calculatedHint')}
            </Text>
          </Stack>
        )}
      </Stack>
    </FormDialog>
  )
}
