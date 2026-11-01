import {
  Button,
  Fieldset,
  HStack,
  Input,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Wrap,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuCheck, LuPlus } from 'react-icons/lu'
import { MAX_EFFORT } from './activityForm'
import { tagColorPalette } from './activityFormatting'

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
export function EffortSlider({ label, value, onChange, error }: EffortSliderProps) {
  const { t } = useTranslation()
  const effort = value === '' ? 0 : Number(value)
  const text = (current: number) =>
    current === 0 ? t('activities.form.effortNone') : `${current}/${MAX_EFFORT}`

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
        <Slider.Thumbs />
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
}

interface EmojiChoiceProps<T extends string> {
  label: string
  value: T | ''
  onChange: (value: T | '') => void
  options: readonly { id: T; label: string; emoji: string }[]
}

/**
 * One of a few ordered values as buttons with an emoji and the label underneath. The emoji carries
 * the value at a glance; the label keeps it readable and is the accessible name. Pressing the chosen
 * button again clears the value, as every option is optional.
 */
export function EmojiChoice<T extends string>({
  label,
  value,
  onChange,
  options,
}: EmojiChoiceProps<T>) {
  return (
    <Fieldset.Root>
      <Fieldset.Legend fontSize="sm" fontWeight="medium" color="fg">
        {label}
      </Fieldset.Legend>
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

/** The backend's limit for a tag name. */
const MAX_TAG_LENGTH = 50

interface TagChipsProps {
  label: string
  options: readonly { id: string; label: string }[]
  value: string[]
  onChange: (ids: string[]) => void
  /** More tags exist than were loaded. */
  hasMore: boolean
  /** Creates a tag from the typed name; `clear` empties the field once the tag is there. */
  onCreate: (name: string, clear: () => void) => void
  creating: boolean
}

/**
 * Tags as chips that are switched on and off, in the colours the table uses, and a field to create a
 * new one without leaving the form. Enter in that field creates the tag, not the activity.
 */
export function TagChips({
  label,
  options,
  value,
  onChange,
  hasMore,
  onCreate,
  creating,
}: TagChipsProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const create = () => {
    if (trimmed && !creating) onCreate(trimmed, () => setName(''))
  }
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((other) => other !== id) : [...value, id])

  return (
    <Fieldset.Root>
      <Fieldset.Legend fontSize="sm" fontWeight="medium" color="fg">
        {label}
      </Fieldset.Legend>
      <Stack gap="3">
        {options.length > 0 && (
          <Wrap gap="2">
            {options.map((option) => {
              const on = value.includes(option.id)
              return (
                <Button
                  key={option.id}
                  size="xs"
                  rounded="full"
                  variant={on ? 'subtle' : 'outline'}
                  colorPalette={on ? tagColorPalette(option.id) : 'gray'}
                  aria-pressed={on}
                  onClick={() => toggle(option.id)}
                >
                  {on && <LuCheck aria-hidden />}
                  {option.label}
                </Button>
              )
            })}
          </Wrap>
        )}
        {hasMore && (
          <Text fontSize="xs" color="fg.muted">
            {t('checklist.moreOptions')}
          </Text>
        )}
        <HStack gap="2">
          <Input
            size="sm"
            maxLength={MAX_TAG_LENGTH}
            aria-label={t('activities.form.newTag')}
            placeholder={t('activities.form.newTag')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              create()
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={create}
            disabled={!trimmed}
            loading={creating}
          >
            <LuPlus aria-hidden />
            {t('activities.form.createTag')}
          </Button>
        </HStack>
      </Stack>
    </Fieldset.Root>
  )
}
