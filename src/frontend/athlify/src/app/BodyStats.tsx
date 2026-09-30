import { Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import ChartBodyStats from '../components/ChartBodyStats'
import { Page } from '../components/Page'
import TableBodyStats from '../components/TableBodyStats'

function BodyStats() {
  const { t } = useTranslation()

  return (
    <Page title={t('nav.bodyStats')}>
      <Stack gap="10">
        <Stack gap="4">
          <ChartBodyStats />
        </Stack>
        <Stack gap="4">
          <TableBodyStats />
        </Stack>
      </Stack>
    </Page>
  )
}

export default BodyStats
