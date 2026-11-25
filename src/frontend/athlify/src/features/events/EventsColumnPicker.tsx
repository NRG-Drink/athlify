import { useTranslation } from 'react-i18next'
import { GridColumnPicker } from '../../components/ag-grid/GridColumnPicker'
import { eventsColumnIds } from './EventsGridState'

type EventsColumnPickerProps = {
  visibleColumns: string[]
  onColumnVisibleChange: (column: string, visible: boolean) => void
}

export function EventsColumnPicker({
  visibleColumns,
  onColumnVisibleChange,
}: EventsColumnPickerProps) {
  const { t } = useTranslation()

  return (
    <GridColumnPicker
      visibleColumns={visibleColumns}
      columns={eventsColumnIds
        .filter((column) => column !== 'delete')
        .map((id) => ({ id, label: t(`events.columns.${id}`) }))}
      openLabel={t('events.columnPicker.open')}
      dialogLabel={t('events.columnPicker.label')}
      onColumnVisibleChange={onColumnVisibleChange}
    />
  )
}
