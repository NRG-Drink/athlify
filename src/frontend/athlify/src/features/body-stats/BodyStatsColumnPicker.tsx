import { useTranslation } from 'react-i18next'
import { GridColumnPicker } from '../../components/ag-grid/GridColumnPicker'
import { bodyStatsColumnIds } from './BodyStatsGridState'

type BodyStatsColumnPickerProps = {
  visibleColumns: string[]
  onColumnVisibleChange: (column: string, visible: boolean) => void
}

export function BodyStatsColumnPicker({
  visibleColumns,
  onColumnVisibleChange,
}: BodyStatsColumnPickerProps) {
  const { t } = useTranslation()

  return (
    <GridColumnPicker
      visibleColumns={visibleColumns}
      columns={bodyStatsColumnIds
        .filter((column) => column !== 'actions')
        .map((id) => ({ id, label: t(`bodyStats.columns.${id}`) }))}
      openLabel={t('bodyStats.columnPicker.open')}
      dialogLabel={t('bodyStats.columnPicker.label')}
      onColumnVisibleChange={onColumnVisibleChange}
    />
  )
}
