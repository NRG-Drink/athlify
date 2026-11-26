import { Flex, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

const METRIC_BUTTON_COUNT = 5
const STAT_COUNT = 4
const TABLE_ROW_COUNT = 6

/** Loading placeholder with the final layout, so the page does not jump when the data arrives. */
export function BodyStatsSkeleton() {
  const { t } = useTranslation()

  return (
    <Stack gap="6" role="status" aria-busy="true" aria-label={t('page.loading')}>
      <Skeleton h="12" borderRadius="15px" />
      <Stack gap="4" borderWidth="1px" borderRadius="l3" p={{ base: '4', md: '6' }}>
        <Skeleton h="7" w="32" />
        <Flex wrap="wrap" gap="2">
          {Array.from({ length: METRIC_BUTTON_COUNT }, (_, i) => (
            <Skeleton key={i} h="8" w="24" borderRadius="l2" />
          ))}
        </Flex>
        <SimpleGrid columns={{ base: 2, md: STAT_COUNT }} gap="4">
          {Array.from({ length: STAT_COUNT }, (_, i) => (
            <Skeleton key={i} h="12" />
          ))}
        </SimpleGrid>
        <Skeleton h="240px" borderRadius="l2" />
      </Stack>
      <Stack gap="2">
        {Array.from({ length: TABLE_ROW_COUNT }, (_, i) => (
          <Skeleton key={i} h="10" />
        ))}
      </Stack>
    </Stack>
  )
}
