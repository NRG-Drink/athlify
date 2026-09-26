import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router-dom'
import { Page } from '../components/Page'
import { AppLayout } from '../layouts/AppLayout'

export function RouteErrorPage() {
  const { t } = useTranslation()
  const error = useRouteError()
  console.error(error)

  return (
    <AppLayout>
      <Page title={t('routeError.title')} status="error" errorMessage={t('routeError.message')} />
    </AppLayout>
  )
}
