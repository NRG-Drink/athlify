import { Skeleton, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

/** Placeholder with the shape of a `DataTable`: the count line, the header and a few rows. */
export function DataTableSkeleton({ rows = 6 }: { rows?: number }) {
  const { t } = useTranslation()
  return (
    <Stack gap="3" role="status" aria-busy="true" aria-label={t('page.loading')}>
      <Skeleton h="4" w="8rem" borderRadius="l1" />
      <Stack gap="2">
        <Skeleton h="10" borderRadius="l2" />
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} h="12" borderRadius="l2" />
        ))}
      </Stack>
    </Stack>
  )
}
