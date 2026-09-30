import { Button, Stack } from '@chakra-ui/react'
import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { AddBodyStatsDialog } from '../components/AddBodyStatsDialog'
import ChartBodyStats from '../components/ChartBodyStats'
import { LoadingIndicator, Page } from '../components/Page'
import TableBodyStats from '../components/TableBodyStats'
import type { BodyStatsQuery } from './__generated__/BodyStatsQuery.graphql'

const bodyStatsQuery = graphql`
  query BodyStatsQuery {
    bodyStats {
      uid
      date
      weight
      bodyFatPercentage
      musclePercentage
      waterPercentage
      boneMass
    }
  }
`

function BodyStatsContent({ fetchKey }: { fetchKey: number }) {
  const { bodyStats } = useLazyLoadQuery<BodyStatsQuery>(
    bodyStatsQuery,
    {},
    { fetchKey, fetchPolicy: 'network-only' },
  )

  return (
    <Stack gap="10">
      <Stack gap="4">
        <ChartBodyStats bodyStats={bodyStats} />
      </Stack>
      <Stack gap="4">
        <TableBodyStats bodyStats={bodyStats} />
      </Stack>
    </Stack>
  )
}

function BodyStats() {
  const { t } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)

  return (
    <Page
      title={t('nav.bodyStats')}
      actions={
        <Button onClick={() => setDialogOpen(true)}>
          <LuPlus aria-hidden />
          {t('bodyStats.add.open')}
        </Button>
      }
    >
      <Suspense fallback={<LoadingIndicator />}>
        <BodyStatsContent fetchKey={fetchKey} />
      </Suspense>
      <AddBodyStatsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => setFetchKey((key) => key + 1)}
      />
    </Page>
  )
}

export default BodyStats
