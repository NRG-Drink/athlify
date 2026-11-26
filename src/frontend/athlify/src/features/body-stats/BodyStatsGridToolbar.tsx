import { Box, Button, Text } from '@chakra-ui/react'
import { LuPlus } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import { BodyStatsColumnPicker } from './BodyStatsColumnPicker'

type BodyStatsGridToolbarProps = {
  resultCount: number | null
  visibleColumns: string[]
  onCreate: () => void
  onColumnVisibleChange: (column: string, visible: boolean) => void
}

export function BodyStatsGridToolbar({
  resultCount,
  visibleColumns,
  onCreate,
  onColumnVisibleChange,
}: BodyStatsGridToolbarProps) {
  const { t } = useTranslation()

  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: '1fr', sm: '1fr auto' }}
      alignItems="center"
      gap="3"
    >
      <Text fontSize="sm" color="fg.muted" aria-live="polite">
        {resultCount === null ? '' : t('bodyStats.resultCount', { count: resultCount })}
      </Text>
      <Box
        display="grid"
        gridTemplateColumns="max-content max-content"
        justifyContent={{ base: 'start', sm: 'end' }}
        gap="2"
      >
        <Button size="sm" onClick={onCreate}>
          <LuPlus aria-hidden />
          {t('bodyStats.add.open')}
        </Button>
        <BodyStatsColumnPicker
          visibleColumns={visibleColumns}
          onColumnVisibleChange={onColumnVisibleChange}
        />
      </Box>
    </Box>
  )
}
