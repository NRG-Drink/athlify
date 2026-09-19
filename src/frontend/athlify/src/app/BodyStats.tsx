import ChartBodyStatsChakra from '../components/ChartBodyStatsChakra'
import ChartBodyStatsHybrid from '../components/ChartBodyStatsHybrid'
import ChartBodyStatsRecharts from '../components/ChartBodyStatsRecharts'
import DemoChakra from '../components/DemoChakra'

function BodyStats() {
  return (
    <div>
      <p>Body Stats</p>

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
