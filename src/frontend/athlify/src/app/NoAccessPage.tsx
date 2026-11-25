import { Button, Stack, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../components/Page'
import { paths } from '../navigation/paths'

/** Shown inside the app shell when a signed-in user opens an area their role does not allow. */
export function NoAccessPage() {
  const { t } = useTranslation()
  return (
    <Page title={t('noAccess.title')}>
      <Stack gap="4" align="flex-start">
        <Text color="fg.muted">{t('noAccess.message')}</Text>
        <Button asChild variant="outline">
          <RouterLink to={paths.dashboard}>{t('notFound.backToDashboard')}</RouterLink>
        </Button>
      </Stack>
    </Page>
  )
}
