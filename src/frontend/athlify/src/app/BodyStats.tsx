import { useTranslation } from 'react-i18next'
import ChartBodyStatsChakra from '../components/ChartBodyStatsChakra'
import ChartBodyStatsHybrid from '../components/ChartBodyStatsHybrid'
import ChartBodyStatsRecharts from '../components/ChartBodyStatsRecharts'
import DemoChakra from '../components/DemoChakra'

function BodyStats() {
  const { t } = useTranslation()

  return (
    <div>
      <p>{t('bodyStats')}</p>

      <DemoChakra />
      <p>Recharts Chart</p>
      <ChartBodyStatsRecharts />
      <p>Chakra Chart</p>
      <ChartBodyStatsChakra />
      <p>Hybrid Chart</p>
      <ChartBodyStatsHybrid />
    </div>
  )
}

export default BodyStats
