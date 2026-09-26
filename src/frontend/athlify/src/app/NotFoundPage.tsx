import { Button, Stack, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../components/Page'
import { paths } from '../navigation/paths'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Page title={t('notFound.title')}>
      <Stack gap="4" align="flex-start">
        <Text color="fg.muted">{t('notFound.message')}</Text>
        <Button asChild variant="outline">
          <RouterLink to={paths.dashboard}>{t('notFound.backToDashboard')}</RouterLink>
        </Button>
      </Stack>
    </Page>
  )
}
