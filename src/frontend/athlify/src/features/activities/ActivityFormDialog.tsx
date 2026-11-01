import {
  Box,
  Button,
  Collapsible,
  Field,
  Fieldset,
  Grid,
  Input,
  InputGroup,
  NativeSelect,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LuChevronRight } from 'react-icons/lu'
import { Checklist } from '../../components/Checklist'
import { FormDialog } from '../../components/FormDialog'
import { useFormat } from '../../i18n/useFormat'
import {
  detailFields,
  heartRateFields,
  hasDetails,
  MAX_DESCRIPTION_LENGTH,
  toInput,
  validate,
  type ActivityFormErrors,
  type ActivityFormInput,
  type ActivityFormValues,
} from './activityForm'
import { activityTypes, moods, winds, type FilterOption } from './activityFilters'
import {
  enumLabel,
  enumOptions,
  formatOptionalNumber,
  moodEmoji,
  windEmoji,
} from './activityFormatting'
import { EffortSlider, EmojiChoice, TagChips } from './ActivityFormFields'

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

/** Longer checklists get a search field. */
const SEARCHABLE_FROM = 8

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
  options: readonly { id: T; label: string }[]
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

interface NumberProps {
  label: string
  value: string
  onChange: (value: string) => void
  unit?: string
  required?: boolean
  error?: string
  helper?: ReactNode
  /** `text` for the duration: phone number pads have no colon. */
  inputMode?: 'decimal' | 'numeric' | 'text'
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  required,
  error,
  helper,
  inputMode = 'decimal',
}: NumberProps) {
  // type="text": a number input rejects the decimal comma of German keyboards.
  const input = (
    <Input
      type="text"
      inputMode={inputMode}
      textAlign="end"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
  return (
    <Field.Root required={required} invalid={!!error}>
      <Field.Label>{label}</Field.Label>
      {/* An addon, not an overlay: an overlay is one input height wide and covers the digits of
          longer units such as "bpm". */}
      {unit ? <InputGroup endAddon={unit}>{input}</InputGroup> : input}
      {helper && !error && <Field.HelperText>{helper}</Field.HelperText>}
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
      setDetailsOpen(mode === 'edit' && hasDetails(initialValues))
    }
  }

  const set = <K extends keyof ActivityFormValues>(key: K, value: ActivityFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = () => {
    const found = validate(values, t)
    setErrors(found)
    if (Object.keys(found).length === 0) onSave(toInput(values))
    // An error inside the folded details must not stay hidden.
    else if (detailFields.some((field) => found[field])) setDetailsOpen(true)
  }

  /** An existing tag of that name is ticked instead of being created twice. */
  const addTag = (name: string, clear: () => void) => {
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
  }

  const unit = (key: string) => t(`activities.units.${key}`)

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
            <Field.Root required invalid={!!errors.date}>
              <Field.Label>{t('activities.form.date')}</Field.Label>
              <Input
                type="datetime-local"
                value={values.date}
                onChange={(event) => set('date', event.target.value)}
              />
              <Field.ErrorText>{errors.date}</Field.ErrorText>
            </Field.Root>
            <SelectField
              label={t('activities.columns.type')}
              value={values.type}
              onChange={(value) => value && set('type', value)}
              options={enumOptions(t, 'types', activityTypes)}
            />
          </SimpleGrid>
          <SimpleGrid columns={2} gap="4">
            <NumberField
              label={t('activities.columns.duration')}
              value={values.duration}
              onChange={(value) => set('duration', value)}
              unit={unit('duration')}
              required
              error={errors.duration}
              helper={t('activities.form.durationHint')}
              inputMode="text"
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
            <SelectField
              label={t('activities.columns.vehicle')}
              value={values.vehicleId}
              onChange={(value) => set('vehicleId', value)}
              emptyLabel={t('activities.form.noVehicle')}
              options={options.vehicles}
            />
          </SimpleGrid>
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
            </Button>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <Stack gap="4" pt="4">
              <Fieldset.Root>
                <Fieldset.Legend fontSize="sm" fontWeight="medium" color="fg">
                  {t('activities.form.heartRate')}
                </Fieldset.Legend>
                <SimpleGrid columns={3} gap="4">
                  {heartRateFields.map((field) => (
                    <NumberField
                      key={field}
                      label={t(`activities.form.${field}`)}
                      value={values[field]}
                      onChange={(value) => set(field, value)}
                      unit={unit('heartRate')}
                      error={errors[field]}
                      inputMode="numeric"
                    />
                  ))}
                </SimpleGrid>
              </Fieldset.Root>
              <EffortSlider
                label={t('activities.columns.effort')}
                value={values.effort}
                onChange={(value) => set('effort', value)}
                error={errors.effort}
              />
              <EmojiChoice
                label={t('activities.columns.mood')}
                value={values.mood}
                onChange={(value) => set('mood', value)}
                options={enumOptions(t, 'moods', moods).map((option) => ({
                  ...option,
                  emoji: moodEmoji[option.id],
                }))}
              />
              <EmojiChoice
                label={t('activities.columns.wind')}
                value={values.wind}
                onChange={(value) => set('wind', value)}
                options={enumOptions(t, 'winds', winds).map((option) => ({
                  ...option,
                  emoji: windEmoji[option.id],
                }))}
              />
              <Stack gap="2">
                <Text fontWeight="medium" fontSize="sm">
                  {t('activities.columns.gadgets')}
                </Text>
                <Checklist
                  label={t('activities.columns.gadgets')}
                  options={options.gadgets}
                  value={values.gadgetIds}
                  onChange={(ids) => set('gadgetIds', ids)}
                  searchable={options.gadgets.length > SEARCHABLE_FROM}
                  hasMore={options.hasMoreGadgets}
                />
              </Stack>
              <TagChips
                label={t('activities.columns.tags')}
                options={options.tags}
                value={values.tagIds}
                onChange={(ids) => set('tagIds', ids)}
                hasMore={options.hasMoreTags}
                onCreate={addTag}
                creating={creatingTag}
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
              <Text as="dt" color="fg.muted">
                {t('activities.columns.speed')}*
              </Text>
              <Text as="dd">
                {formatOptionalNumber(format, shown.calculated.averageSpeed, 1)}
                {shown.calculated.averageSpeed != null && ` ${unit('speed')}`}
              </Text>
              <Text as="dt" color="fg.muted">
                {t('activities.columns.tss')}*
              </Text>
              <Text as="dd">{formatOptionalNumber(format, shown.calculated.tss, 0)}</Text>
              <Text as="dt" color="fg.muted">
                {t('activities.form.source')}*
              </Text>
              <Text as="dd">{enumLabel(t, 'sources', shown.calculated.source)}</Text>
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
