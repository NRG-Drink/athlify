import { SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

/** Loading placeholder with the final layout, so the page does not jump when the data arrives. */
export function BodyStatsSkeleton() {
  const { t } = useTranslation()

  return (
    <Stack gap="8" role="status" aria-busy="true" aria-label={t('page.loading')}>
      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap="3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} h="24" borderRadius="l3" />
        ))}
      </SimpleGrid>
      <Skeleton h="72" borderRadius="l3" />
      <Stack gap="2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} h="10" />
        ))}
      </Stack>
    </Stack>
  )
}
