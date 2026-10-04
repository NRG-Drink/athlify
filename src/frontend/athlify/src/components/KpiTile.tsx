import { Stack, Text, chakra } from '@chakra-ui/react'
import { LuArrowDown, LuArrowUp, LuMinus } from 'react-icons/lu'

export interface KpiTileProps {
  label: string
  /** Pre-formatted value without the unit, or `undefined` when there is no data. */
  value?: string
  unit: string
  /** Pre-formatted change (for example `−0.7 kg`) and the direction used for the arrow. */
  delta?: { text: string; direction: 'up' | 'down' | 'flat' }
  /** Line under the value: the comparison period, or why there is no change to show. */
  note: string
  selected: boolean
  onSelect: () => void
}

const arrows = { up: LuArrowUp, down: LuArrowDown, flat: LuMinus } as const

// A tile selects the metric shown in the chart. The selected tile carries the same skewed
// indicator bar as the active navigation item (ADR-005: one gradient element per area).
export function KpiTile({ label, value, unit, delta, note, selected, onSelect }: KpiTileProps) {
  const Arrow = delta ? arrows[delta.direction] : undefined

  return (
    <chakra.button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      position="relative"
      overflow="hidden"
      display="block"
      w="full"
      h="full"
      textAlign="start"
      bg={selected ? 'brand.subtle' : 'bg.panel'}
      borderWidth="1px"
      borderColor={selected ? 'brand.solid' : 'border'}
      borderRadius="l3"
      px="4"
      py="3"
      cursor="pointer"
      focusVisibleRing="outside"
      transitionProperty="border-color, background-color"
      transitionDuration="150ms"
      _hover={{ borderColor: selected ? 'brand.solid' : 'brand.emphasized' }}
      _motionReduce={{ transition: 'none' }}
      _after={{
        content: '""',
        position: 'absolute',
        insetX: '3',
        bottom: '0',
        h: '1',
        bgImage: 'indicator',
        transform: 'skewX(-20deg)',
        opacity: selected ? 1 : 0,
      }}
    >
      <Stack gap="1">
        <Text textStyle="kicker" color="fg.muted">
          {label}
        </Text>
        <Text as="span" display="flex" alignItems="baseline" gap="1">
          <Text as="span" textStyle="kpi" fontSize={{ base: '1.5rem', md: '2rem' }}>
            {value ?? '—'}
          </Text>
          {value !== undefined && (
            <Text as="span" fontSize="md" color="fg.muted">
              {unit}
            </Text>
          )}
        </Text>
        <Text
          as="span"
          display="flex"
          flexWrap="wrap"
          alignItems="center"
          columnGap="2"
          fontSize="sm"
          color="fg.muted"
        >
          {delta && Arrow && (
            <Text as="span" display="inline-flex" alignItems="center" gap="1" whiteSpace="nowrap">
              <Arrow aria-hidden />
              {delta.text}
            </Text>
          )}{' '}
          <Text as="span" whiteSpace="nowrap">
            {note}
          </Text>
        </Text>
      </Stack>
    </chakra.button>
  )
}
