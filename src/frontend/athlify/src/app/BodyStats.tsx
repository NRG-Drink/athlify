import { Heading, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import ChartBodyStatsChakra from '../components/ChartBodyStatsChakra'
import ChartBodyStatsHybrid from '../components/ChartBodyStatsHybrid'
import ChartBodyStatsRecharts from '../components/ChartBodyStatsRecharts'
import { Page } from '../components/Page'

function BodyStats() {
  const { t } = useTranslation()

  return (
    <Page title={t('nav.bodyStats')}>
      <Stack gap="10">
        <Stack gap="4">
          <Heading as="h2" fontSize="1.5rem" lineHeight="1.2">
            Hybrid Chart
          </Heading>
          <ChartBodyStatsHybrid />
        </Stack>
        <Stack gap="4">
          <Heading as="h2" fontSize="1.5rem" lineHeight="1.2">
            Recharts Chart
          </Heading>
          <ChartBodyStatsRecharts />
        </Stack>
        <Stack gap="4">
          <Heading as="h2" fontSize="1.5rem" lineHeight="1.2">
            Chakra Chart
          </Heading>
          <ChartBodyStatsChakra />
        </Stack>
      </Stack>
    </Page>
  )
}

export default BodyStats
