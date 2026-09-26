import { useTranslation } from 'react-i18next'
import { Page } from '../components/Page'

export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return <Page title={t(titleKey)} status="empty" emptyMessage={t('page.comingSoon')} />
}
