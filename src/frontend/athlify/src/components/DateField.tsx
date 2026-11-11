import {
  DatePicker,
  IconButton,
  Input,
  InputGroup,
  parseDate as toCalendarDate,
  Portal,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuCalendarDays } from 'react-icons/lu'
import { localeFor } from '../i18n/useFormat'
import { formatDate, parseDate } from '../lib/dates'

interface DateFieldProps {
  /** `DD.MM.YYYY`, empty when no date is chosen, or the typed text while it is not a date. */
  value: string
  onChange: (value: string) => void
  /** Accessible name of the text field. */
  label: string
  invalid?: boolean
  /** In a dialog the calendar must stay inside its focus trap, so it is not portalled. */
  portalled?: boolean
}

type DateParts = { year: number; month: number; day: number }

const toDate = (value: DateParts) => new Date(value.year, value.month - 1, value.day)

/**
 * A date as `DD.MM.YYYY` with a calendar. The text field is a plain controlled input: typed text
 * reaches the form as it is, valid text is normalised when the field is left (`1.2.25` becomes
 * `01.02.2025`) and invalid text stays, so the form's validation reports it. The calendar only
 * writes a picked day; it follows the UI language and starts the week on Monday.
 */
export function DateField({ value, onChange, label, invalid, portalled = true }: DateFieldProps) {
  const { t, i18n } = useTranslation()
  const date = parseDate(value)
  const content = (
    <DatePicker.Positioner>
      <DatePicker.Content>
        <DatePicker.View view="day">
          <DatePicker.Header />
          <DatePicker.DayTable />
        </DatePicker.View>
        <DatePicker.View view="month">
          <DatePicker.Header />
          <DatePicker.MonthTable />
        </DatePicker.View>
        <DatePicker.View view="year">
          <DatePicker.Header />
          <DatePicker.YearTable />
        </DatePicker.View>
      </DatePicker.Content>
    </DatePicker.Positioner>
  )

  return (
    <DatePicker.Root
      value={date ? [toCalendarDate(date)] : []}
      onValueChange={(details) => {
        const [next] = details.value
        if (next) onChange(formatDate(toDate(next)))
      }}
      locale={localeFor(i18n.language)}
      startOfWeek={1}
      // The calendar's three tables only exist while it is open.
      lazyMount
      unmountOnExit
      invalid={invalid}
      positioning={{ placement: 'bottom-start' }}
    >
      {/* The picker's own input would replace unreadable text with another date on blur. */}
      <DatePicker.Control>
        <InputGroup
          endElement={
            <DatePicker.Trigger asChild>
              <IconButton variant="ghost" size="xs" aria-label={t('form.openCalendar')} me="-2">
                <LuCalendarDays />
              </IconButton>
            </DatePicker.Trigger>
          }
        >
          <Input
            aria-label={label}
            aria-invalid={invalid || undefined}
            placeholder={t('form.datePlaceholder')}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => {
              if (date) onChange(formatDate(date))
              else onChange(value.trim())
            }}
          />
        </InputGroup>
      </DatePicker.Control>
      {portalled ? <Portal>{content}</Portal> : content}
    </DatePicker.Root>
  )
}
