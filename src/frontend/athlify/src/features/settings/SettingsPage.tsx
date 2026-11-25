import { Grid, Skeleton, type GridProps } from '@chakra-ui/react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import type { ApiLanguage } from '../../i18n/languages'
import { useFetchKey } from '../../relay/useFetchKey'
import { PasswordForm } from './PasswordForm'
import { ProfileForm } from './ProfileForm'
import type { SettingsPageQuery } from './__generated__/SettingsPageQuery.graphql'

const query = graphql`
  query SettingsPageQuery {
    me {
      id
      username
      firstName
      lastName
      language
    }
  }
`

/** The two-column layout of the forms; the skeleton shares it so the page does not jump. */
const SettingsGrid = (props: GridProps) => (
  <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="8" {...props} />
)

/** Form-shaped placeholder, so the page does not jump when the profile arrives. */
function SettingsSkeleton() {
  const { t } = useTranslation()
  return (
    <SettingsGrid role="status" aria-busy="true" aria-label={t('page.loading')}>
      <Skeleton h="80" borderRadius="l3" />
      <Skeleton h="80" borderRadius="l3" />
    </SettingsGrid>
  )
}

function SettingsForms({ fetchKey }: { fetchKey: number }) {
  const { me } = useLazyLoadQuery<SettingsPageQuery>(
    query,
    {},
    { fetchKey, fetchPolicy: 'store-or-network' },
  )
  return (
    <SettingsGrid>
      <ProfileForm
        username={me.username}
        saved={{
          firstName: me.firstName,
          lastName: me.lastName,
          language: me.language as ApiLanguage,
        }}
      />
      <PasswordForm />
    </SettingsGrid>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()
  return (
    <Page title={t('nav.settings')}>
      <QueryBoundary
        onRetry={retry}
        fallback={<SettingsSkeleton />}
        errorMessage={t('settings.loadFailed')}
      >
        <SettingsForms fetchKey={fetchKey} />
      </QueryBoundary>
    </Page>
  )
}
