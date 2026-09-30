import { Button, Stack } from '@chakra-ui/react'
import { Suspense, startTransition, useState } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { AddBodyStatsDialog } from '../components/AddBodyStatsDialog'
import ChartBodyStats from '../components/ChartBodyStats'
import { LoadingIndicator, Page } from '../components/Page'
import type { BodyStatsEntry } from '../components/bodyStatsTypes'
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

interface BodyStatsContentProps {
  fetchKey: number
  dialogOpen: boolean
  onDialogOpenChange: (open: boolean) => void
  onCreated: () => void
}

function BodyStatsContent({
  fetchKey,
  dialogOpen,
  onDialogOpenChange,
  onCreated,
}: BodyStatsContentProps) {
  const { bodyStats } = useLazyLoadQuery<BodyStatsQuery>(
    bodyStatsQuery,
    {},
    { fetchKey, fetchPolicy: 'network-only' },
  )

  const latest = bodyStats.reduce<BodyStatsEntry | undefined>(
    (newest, entry) =>
      !newest ||
      new Date(entry.date as string).getTime() > new Date(newest.date as string).getTime()
        ? entry
        : newest,
    undefined,
  )

  return (
    <Stack gap="10">
      <Stack gap="4">
        <ChartBodyStats bodyStats={bodyStats} />
      </Stack>
      <Stack gap="4">
        <TableBodyStats bodyStats={bodyStats} />
      </Stack>
      <AddBodyStatsDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        onCreated={onCreated}
        latest={latest}
      />
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
        <BodyStatsContent
          fetchKey={fetchKey}
          dialogOpen={dialogOpen}
          onDialogOpenChange={setDialogOpen}
          onCreated={() => startTransition(() => setFetchKey((key) => key + 1))}
        />
      </Suspense>
    </Page>
  )
}

export default BodyStats
