import { Box, Button, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { GridColumnPicker } from './GridColumnPicker'

type GridToolbarProps = {
  /** Translation namespace holding `resultCount`, `add.open`, `columns.*` and `columnPicker.*`. */
  namespace: string
  /** The columns the user can show or hide; leave out the action column. */
  columnIds: readonly string[]
  resultCount: number | null
  isCreating: boolean
  visibleColumns: string[]
  onCreate: () => void
  onColumnVisibleChange: (column: string, visible: boolean) => void
}

/** Result count, add button and column picker above a grid. */
export function GridToolbar({
  namespace,
  columnIds,
  resultCount,
  isCreating,
  visibleColumns,
  onCreate,
  onColumnVisibleChange,
}: GridToolbarProps) {
  const { t } = useTranslation()

  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: '1fr', sm: '1fr auto' }}
      alignItems="center"
      gap="3"
    >
      <Text fontSize="sm" color="fg.muted" aria-live="polite">
        {resultCount === null ? '' : t(`${namespace}.resultCount`, { count: resultCount })}
      </Text>
      <Box
        display="grid"
        gridTemplateColumns="max-content max-content"
        justifyContent={{ base: 'start', sm: 'end' }}
        gap="2"
      >
        <Button size="sm" onClick={onCreate} loading={isCreating}>
          <LuPlus aria-hidden />
          {t(`${namespace}.add.open`)}
        </Button>
        <GridColumnPicker
          visibleColumns={visibleColumns}
          columns={columnIds.map((id) => ({ id, label: t(`${namespace}.columns.${id}`) }))}
          openLabel={t(`${namespace}.columnPicker.open`)}
          dialogLabel={t(`${namespace}.columnPicker.label`)}
          onColumnVisibleChange={onColumnVisibleChange}
        />
      </Box>
    </Box>
  )
}
