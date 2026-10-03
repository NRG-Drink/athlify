import { Button, Group } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { periods, type Period } from '../lib/period'

export interface PeriodPickerProps {
  value: Period
  onChange: (period: Period) => void
}

/** Toggle buttons for the period; exactly one is pressed. */
export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const { t } = useTranslation()

  return (
    <Group attached role="group" aria-label={t('period.label')}>
      {periods.map((period) => {
        const active = period === value
        return (
          <Button
            key={period}
            size="sm"
            variant={active ? 'subtle' : 'outline'}
            colorPalette={active ? 'brand' : 'gray'}
            aria-pressed={active}
            aria-label={t(`period.long.${period}`)}
            onClick={() => onChange(period)}
          >
            {t(`period.short.${period}`)}
          </Button>
        )
      })}
    </Group>
  )
}
