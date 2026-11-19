import { Box } from '@chakra-ui/react'
import { useGridFilter, type CustomFilterProps } from 'ag-grid-react'
import { useTranslation } from 'react-i18next'

type EventRow = {
  type: string
}

const eventTypes = ['CRASH', 'INJURY', 'ILLNESS', 'REPAIR', 'BREAK', 'GOAL', 'OTHER'] as const
type EventType = (typeof eventTypes)[number]
type TypeFilterModel = { values: EventType[] }
type TypeFilterParams = Pick<
  CustomFilterProps<EventRow, unknown, TypeFilterModel>,
  'model' | 'onModelChange'
>

export function MyEventsTypeFilter({ model, onModelChange }: TypeFilterParams) {
  const { t } = useTranslation()
  useGridFilter({ doesFilterPass: () => true })

  const selectedTypes = model?.values ?? null
  const allSelected = selectedTypes === null

  const updateSelection = (values: EventType[] | null) => {
    onModelChange(values === null ? null : { values })
  }

  return (
    <Box
      display="grid"
      gap="2"
      padding="4"
      role="group"
      aria-label={t('events.typeFilter.ariaLabel')}
    >
      <Box as="label" display="flex" alignItems="center" gap="2" cursor="pointer">
        <input
          type="checkbox"
          aria-label={t('events.typeFilter.selectAll')}
          checked={allSelected}
          onChange={(event) => updateSelection(event.target.checked ? null : [])}
        />
        {t('events.typeFilter.selectAll')}
      </Box>
      {eventTypes.map((type) => (
        <Box as="label" key={type} display="flex" alignItems="center" gap="2" cursor="pointer">
          <input
            type="checkbox"
            aria-label={t(`events.types.${type}`)}
            checked={allSelected || selectedTypes.includes(type)}
            onChange={(event) => {
              const current = selectedTypes ?? [...eventTypes]
              const next = event.target.checked
                ? [...current, type]
                : current.filter((selectedType) => selectedType !== type)
              updateSelection(
                next.length === eventTypes.length
                  ? null
                  : eventTypes.filter((value) => next.includes(value)),
              )
            }}
          />
          {t(`events.types.${type}`)}
        </Box>
      ))}
    </Box>
  )
}
