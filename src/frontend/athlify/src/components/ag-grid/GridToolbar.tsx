import { Box, Button, Text } from '@chakra-ui/react'
import type { Ref } from 'react'
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
  /** Makes the result count focusable, so the focus can move there after a row was deleted. */
  countRef?: Ref<HTMLParagraphElement>
  /** The `columns.*` translation key of a column whose key differs from its id. */
  columnLabelKeys?: Readonly<Record<string, string>>
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
  countRef,
  columnLabelKeys = {},
}: GridToolbarProps) {
  const { t } = useTranslation()

  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: '1fr', sm: '1fr auto' }}
      alignItems="center"
      gap="3"
    >
      <Text
        ref={countRef}
        tabIndex={countRef ? -1 : undefined}
        fontSize="sm"
        color="fg.muted"
        aria-live="polite"
        _focusVisible={countRef ? { outline: 'none' } : undefined}
      >
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
          columns={columnIds.map((id) => ({
            id,
            label: t(`${namespace}.columns.${columnLabelKeys[id] ?? id}`),
          }))}
          openLabel={t(`${namespace}.columnPicker.open`)}
          dialogLabel={t(`${namespace}.columnPicker.label`)}
          onColumnVisibleChange={onColumnVisibleChange}
        />
      </Box>
    </Box>
  )
}
