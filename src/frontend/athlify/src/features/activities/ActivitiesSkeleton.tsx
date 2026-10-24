import { Skeleton, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

export function ActivitiesSkeleton() {
  const { t } = useTranslation()
  return (
    <Stack gap="3" role="status" aria-busy="true" aria-label={t('page.loading')}>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} h="12" borderRadius="l2" />
      ))}
    </Stack>
  )
}
