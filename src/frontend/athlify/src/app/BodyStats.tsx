import { Heading, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import ChartBodyStatsChakra from '../components/ChartBodyStatsChakra'
import ChartBodyStatsHybrid from '../components/ChartBodyStatsHybrid'
import ChartBodyStatsRecharts from '../components/ChartBodyStatsRecharts'
import DemoChakra from '../components/DemoChakra'
import { Page } from '../components/Page'

function BodyStats() {
  const { t } = useTranslation()

  return (
    <Page title={t('nav.bodyStats')}>
      <Stack gap="10">
        <DemoChakra />
        <Stack gap="4">
          <Heading as="h2" size="md">
            Hybrid Chart
          </Heading>
          <ChartBodyStatsHybrid />
        </Stack>
        <Stack gap="4">
          <Heading as="h2" size="md">
            Recharts Chart
          </Heading>
          <ChartBodyStatsRecharts />
        </Stack>
        <Stack gap="4">
          <Heading as="h2" size="md">
            Chakra Chart
          </Heading>
          <ChartBodyStatsChakra />
        </Stack>
      </Stack>
    </Page>
  )
}

export default BodyStats
