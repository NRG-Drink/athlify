import { Button, Stack } from '@chakra-ui/react'
import { Suspense, startTransition, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuPlus } from 'react-icons/lu'
import { toaster } from '../components/ui/toaster'
import { AddBodyStatsDialog } from '../components/AddBodyStatsDialog'
import ChartBodyStats from '../components/ChartBodyStats'
import { LoadingIndicator, Page } from '../components/Page'
import type { BodyStatsEntry } from '../components/bodyStatsTypes'
import TableBodyStats from '../components/TableBodyStats'
import type { BodyStatsDeleteMutation } from './__generated__/BodyStatsDeleteMutation.graphql'
import type { BodyStatsQuery } from './__generated__/BodyStatsQuery.graphql'

const bodyStatsQuery = graphql`
  query BodyStatsQuery {
    bodyStats {
      dbId: id
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

const deleteBodyStatsMutation = graphql`
  mutation BodyStatsDeleteMutation($id: Int!) {
    deleteBodyStats(id: $id)
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

  const { t } = useTranslation()
  const [commitDelete] = useMutation<BodyStatsDeleteMutation>(deleteBodyStatsMutation)
  const [deletingUid, setDeletingUid] = useState<string | null>(null)

  const showDeleteError = () => {
    setDeletingUid(null)
    toaster.create({ type: 'error', title: t('bodyStats.delete.errors.failed') })
  }

  const handleDelete = (entry: BodyStatsEntry) => {
    setDeletingUid(entry.uid as string)
    commitDelete({
      variables: { id: entry.dbId },
      onCompleted: (response, graphQlErrors) => {
        if (graphQlErrors?.length || !response.deleteBodyStats) {
          showDeleteError()
          return
        }
        setDeletingUid(null)
        toaster.create({ type: 'success', title: t('bodyStats.delete.success') })
        onCreated()
      },
      onError: showDeleteError,
    })
  }

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
        <TableBodyStats bodyStats={bodyStats} onDelete={handleDelete} deletingUid={deletingUid} />
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
