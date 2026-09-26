import type { IconType } from 'react-icons'
import { useTranslation } from 'react-i18next'
import { Page } from '../components/Page'

interface PlaceholderPageProps {
  titleKey: string
  messageKey: string
  icon: IconType
}

export function PlaceholderPage({ titleKey, messageKey, icon }: PlaceholderPageProps) {
  const { t } = useTranslation()
  return (
    <Page
      title={t(titleKey)}
      status="empty"
      emptyMessage={`${t('page.comingSoon')} ${t(messageKey)}`}
      emptyIcon={icon}
    />
  )
}
