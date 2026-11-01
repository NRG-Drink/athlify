import {
  Box,
  Button,
  Field,
  Fieldset,
  HStack,
  Input,
  Popover,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Wrap,
} from '@chakra-ui/react'
import { memo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LuCheck, LuPlus } from 'react-icons/lu'
import { toggleId } from '../../lib/ids'
import { MAX_EFFORT } from './activityForm'
import { effortLevel } from './activityFormatting'

/** Heading of a group of fields in the activity form. */
export function SectionLegend({ children }: { children: ReactNode }) {
  return (
    <Fieldset.Legend fontSize="sm" fontWeight="medium" color="fg">
      {children}
    </Fieldset.Legend>
  )
}

interface EffortSliderProps {
  label: string
  /** Empty for "not set". */
  value: string
  onChange: (value: string) => void
  error?: string
}

/**
 * Effort from 1 to 10. A slider cannot be empty, so its far left, 0, stands for "not set": that is
 * where a new activity starts, and sliding back there removes the value.
 */
export const EffortSlider = memo(function EffortSlider({
  label,
  value,
  onChange,
  error,
}: EffortSliderProps) {
  const { t } = useTranslation()
  const effort = value === '' ? 0 : Number(value)
  const level = effortLevel(t, effort)
  const text = (current: number) => {
    const group = effortLevel(t, current)
    return group ? `${current}/${MAX_EFFORT} · ${group.label}` : t('activities.form.effortNone')
  }

  return (
    <Slider.Root
      min={0}
      max={MAX_EFFORT}
      step={1}
      value={[effort]}
      onValueChange={(details) => {
        const [next] = details.value
        onChange(next === 0 ? '' : String(next))
      }}
      invalid={!!error}
      getAriaValueText={(details) => text(details.value)}
    >
      <HStack justify="space-between">
        <Slider.Label fontSize="sm" fontWeight="medium">
          {label}
        </Slider.Label>
        <Text fontSize="sm" fontVariantNumeric="tabular-nums" color={effort ? 'fg' : 'fg.muted'}>
          {text(effort)}
        </Text>
      </HStack>
      <Slider.Control>
        <Slider.Track>
          <Slider.Range />
        </Slider.Track>
        <Slider.Thumb index={0}>
          {/* The emoji of the effort's group pops out above the thumb. */}
          {level && (
            <Box
              position="absolute"
              bottom="100%"
              left="50%"
              transform="translateX(-50%)"
              mb="1"
              fontSize="xl"
              lineHeight="1"
              pointerEvents="none"
              aria-hidden
            >
              {level.emoji}
            </Box>
          )}
          <Slider.HiddenInput />
        </Slider.Thumb>
      </Slider.Control>
      <HStack justify="space-between" fontSize="xs" color="fg.muted">
        <Text>{t('activities.form.effortNone')}</Text>
        <Text>
          {MAX_EFFORT} · {t('activities.form.effortHigh')}
        </Text>
      </HStack>
      {error && (
        <Text fontSize="xs" color="fg.error">
          {error}
        </Text>
      )}
    </Slider.Root>
  )
})

export interface EmojiOption<T extends string> {
  id: T
  label: string
  emoji: string
}

interface EmojiChoiceProps<T extends string> {
  label: string
  value: T | ''
  onChange: (value: T | '') => void
  options: readonly EmojiOption<T>[]
}

/**
 * One of a few ordered values as buttons with an emoji and the label underneath. The emoji carries
 * the value at a glance; the label keeps it readable and is the accessible name. Pressing the chosen
 * button again clears the value, as every option is optional.
 */
function EmojiChoiceBase<T extends string>({
  label,
  value,
  onChange,
  options,
}: EmojiChoiceProps<T>) {
  return (
    <Fieldset.Root>
      <SectionLegend>{label}</SectionLegend>
      <SimpleGrid columns={options.length} gap="1">
        {options.map((option) => {
          const chosen = option.id === value
          return (
            <Button
              key={option.id}
              variant={chosen ? 'subtle' : 'ghost'}
              colorPalette={chosen ? 'brand' : undefined}
              aria-pressed={chosen}
              onClick={() => onChange(chosen ? '' : option.id)}
              flexDirection="column"
              gap="0.5"
              h="auto"
              minW="0"
              py="2"
              px="1"
              borderWidth="1px"
              borderColor={chosen ? 'brand.solid' : 'transparent'}
            >
              <Text as="span" fontSize="2xl" lineHeight="1" aria-hidden>
                {option.emoji}
              </Text>
              <Text as="span" fontSize="xs" whiteSpace="normal" textAlign="center" lineHeight="1.2">
                {option.label}
              </Text>
            </Button>
          )
        })}
      </SimpleGrid>
    </Fieldset.Root>
  )
}

// `memo` drops the type parameter, so the cast restores it.
export const EmojiChoice = memo(EmojiChoiceBase) as typeof EmojiChoiceBase

/** The backend's limit for a tag name. */
const MAX_TAG_LENGTH = 50

export interface ChipCreate {
  /** Creates an entry from the typed name; `clear` empties the field once it is there. */
  onCreate: (name: string, clear: () => void) => void
  creating: boolean
}

interface ChipChoiceProps {
  label: string
  options: readonly { id: string; label: string }[]
  value: string[]
  onChange: (ids: string[]) => void
  /** More options exist than were loaded. */
  hasMore: boolean
  /** Colour palette of a chosen chip; brand when not given. */
  colorOf?: (id: string) => string
  /** Shown instead of the chips when there are no options. */
  emptyText?: string
  /** Offers a small button at the end of the chips that opens a popup to create an option. */
  create?: ChipCreate
}

/** A multi-select as chips that are switched on and off, optionally with a field to create one. */
export const ChipChoice = memo(function ChipChoice({
  label,
  options,
  value,
  onChange,
  hasMore,
  colorOf,
  emptyText,
  create,
}: ChipChoiceProps) {
  const { t } = useTranslation()

  return (
    <Fieldset.Root>
      <SectionLegend>{label}</SectionLegend>
      <Stack gap="3">
        {options.length === 0 && emptyText && (
          <Text fontSize="sm" color="fg.muted">
            {emptyText}
          </Text>
        )}
        {(options.length > 0 || create) && (
          <Wrap gap="2">
            {options.map((option) => {
              const on = value.includes(option.id)
              return (
                <Button
                  key={option.id}
                  size="xs"
                  rounded="full"
                  variant={on ? 'subtle' : 'outline'}
                  colorPalette={on ? (colorOf?.(option.id) ?? 'brand') : 'gray'}
                  aria-pressed={on}
                  onClick={() => onChange(toggleId(value, option.id))}
                >
                  {on && <LuCheck aria-hidden />}
                  {option.label}
                </Button>
              )
            })}
            {create && <CreatePopover {...create} />}
          </Wrap>
        )}
        {hasMore && (
          <Text fontSize="xs" color="fg.muted">
            {t('checklist.moreOptions')}
          </Text>
        )}
      </Stack>
    </Fieldset.Root>
  )
})

/**
 * A small chip-like button that opens a popup with the new tag's name. The popup is not portalled, so
 * it stays inside the dialog's focus trap; Enter in it creates the tag and never submits the form.
 */
function CreatePopover({ onCreate, creating }: ChipCreate) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const trimmed = name.trim()
  const create = () => {
    if (!trimmed || creating) return
    onCreate(trimmed, () => {
      setName('')
      setOpen(false)
    })
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open)
        if (!details.open) setName('')
      }}
      initialFocusEl={() => input.current}
      positioning={{ placement: 'bottom-start' }}
    >
      <Popover.Trigger asChild>
        <Button size="xs" rounded="full" variant="outline" borderStyle="dashed" color="fg.muted">
          <LuPlus aria-hidden />
          {t('activities.form.newTag')}
        </Button>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content width="xs" maxWidth="calc(100vw - 2rem)" bg="bg.panel">
          <Popover.Body p="4">
            <Stack gap="3">
              <Field.Root>
                <Field.Label>{t('activities.form.tagName')}</Field.Label>
                <Input
                  ref={input}
                  size="sm"
                  maxLength={MAX_TAG_LENGTH}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    create()
                  }}
                />
              </Field.Root>
              <HStack justify="flex-end" gap="2">
                <Popover.CloseTrigger asChild>
                  <Button size="sm" variant="ghost">
                    {t('form.cancel')}
                  </Button>
                </Popover.CloseTrigger>
                <Button size="sm" onClick={create} disabled={!trimmed} loading={creating}>
                  {t('activities.form.createTag')}
                </Button>
              </HStack>
            </Stack>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}
