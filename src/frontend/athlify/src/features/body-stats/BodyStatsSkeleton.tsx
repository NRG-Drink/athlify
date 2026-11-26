import { Skeleton, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

/** Loading placeholder with the final layout, so the page does not jump when the data arrives. */
export function BodyStatsSkeleton() {
  const { t } = useTranslation()

  return (
    <Stack gap="8" role="status" aria-busy="true" aria-label={t('page.loading')}>
      <Skeleton h="96" borderRadius="l3" />
      <Stack gap="2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} h="10" />
        ))}
      </Stack>
    </Stack>
  )
}
