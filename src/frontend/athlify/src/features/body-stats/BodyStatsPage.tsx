import { Button, Flex, Heading, Stack } from '@chakra-ui/react'
import { useMemo, useState, startTransition } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuActivity, LuPlus } from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Page, PageEmptyState } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFormat } from '../../i18n/useFormat'
import { latest } from '../../lib/metrics'
import { parsePeriod, type Period } from '../../lib/period'
import type { BodyStatsPageQuery } from './__generated__/BodyStatsPageQuery.graphql'
import { BodyStatsChart } from './BodyStatsChart'
import { emptyValues, toInputValue, type BodyStatsFormValues } from './bodyStatsForm'
import { BodyStatsFormDialog } from './BodyStatsFormDialog'
import { BodyStatsKpis } from './BodyStatsKpis'
import { bodyStatsMetrics, parseMetric, type BodyStatsMetricKey } from './bodyStatsMetrics'
import { useBodyStatsSeries } from './bodyStatsSeries'
import { BodyStatsSkeleton } from './BodyStatsSkeleton'
import { BodyStatsTable, type BodyStatsRow } from './BodyStatsTable'
import { useBodyStatsMutations } from './useBodyStatsMutations'

const DEFAULT_PERIOD: Period = '90d'

const pageQuery = graphql`
  query BodyStatsPageQuery {
    bodyStats {
      id
      ...bodyStatsSeries_entries
      ...BodyStatsTable_entries
    }
  }
`

type Dialog = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; row: BodyStatsRow }

function rowToValues(row: BodyStatsRow): BodyStatsFormValues {
  return {
    date: toInputValue(row.date),
    weight: String(row.weight),
    bodyFatPercentage: String(row.bodyFatPercentage),
    musclePercentage: String(row.musclePercentage),
    waterPercentage: String(row.waterPercentage),
    boneMass: String(row.boneMass),
    note: row.comments[0]?.content ?? '',
    noteId: row.comments[0]?.id,
  }
}

interface ContentProps {
  fetchKey: number
  dialog: Dialog
  onDialogChange: (dialog: Dialog) => void
}

function BodyStatsContent({ fetchKey, dialog, onDialogChange }: ContentProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const [searchParams, setSearchParams] = useSearchParams()
  const [deleting, setDeleting] = useState<BodyStatsRow | null>(null)

  const { bodyStats } = useLazyLoadQuery<BodyStatsPageQuery>(
    pageQuery,
    {},
    { fetchKey, fetchPolicy: 'network-only' },
  )
  const series = useBodyStatsSeries(bodyStats)
  // Periods count back from the moment the data was last loaded or changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [bodyStats])
  const mutations = useBodyStatsMutations()

  const metric = parseMetric(searchParams.get('metric'))
  const period = parsePeriod(searchParams.get('period'), DEFAULT_PERIOD)

  const setView = (next: { metric?: BodyStatsMetricKey; period?: Period }) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next.metric) params.set('metric', next.metric)
        if (next.period) params.set('period', next.period)
        return params
      },
      { replace: true },
    )

  // New entries start from the newest measurement, because values change only slightly.
  const prefill = useMemo(() => {
    const values: Partial<Record<BodyStatsMetricKey, number>> = {}
    for (const { key } of bodyStatsMetrics) values[key] = latest(series[key])?.value
    return values
  }, [series])

  const closeDialog = () => onDialogChange({ kind: 'closed' })

  if (bodyStats.length === 0) {
    return (
      <>
        <PageEmptyState
          icon={LuActivity}
          title={t('bodyStats.empty.title')}
          message={t('bodyStats.empty.message')}
          action={
            <Button onClick={() => onDialogChange({ kind: 'create' })}>
              <LuPlus aria-hidden />
              {t('bodyStats.empty.action')}
            </Button>
          }
        />
        <BodyStatsFormDialog
          open={dialog.kind === 'create'}
          onOpenChange={(open) => !open && closeDialog()}
          mode="create"
          initialValues={emptyValues()}
          busy={mutations.isSaving}
          onSave={(input) => mutations.add(input, { onSuccess: closeDialog })}
        />
      </>
    )
  }

  return (
    <Stack gap="8">
      <BodyStatsKpis
        series={series}
        metric={metric}
        period={period}
        now={now}
        onSelectMetric={(next) => setView({ metric: next })}
      />
      <BodyStatsChart
        series={series}
        metric={metric}
        period={period}
        now={now}
        onPeriodChange={(next) => setView({ period: next })}
      />
      <Stack gap="4">
        <Flex justify="space-between" align="center" gap="3" wrap="wrap">
          <Heading as="h2" size="lg">
            {t('bodyStats.history')}
          </Heading>
          <Button onClick={() => onDialogChange({ kind: 'create' })}>
            <LuPlus aria-hidden />
            {t('bodyStats.add.open')}
          </Button>
        </Flex>
        <BodyStatsTable
          entries={bodyStats}
          onEdit={(row) => onDialogChange({ kind: 'edit', row })}
          onDelete={setDeleting}
        />
      </Stack>

      <BodyStatsFormDialog
        open={dialog.kind !== 'closed'}
        onOpenChange={(open) => !open && closeDialog()}
        mode={dialog.kind === 'edit' ? 'edit' : 'create'}
        initialValues={dialog.kind === 'edit' ? rowToValues(dialog.row) : emptyValues(prefill)}
        busy={mutations.isSaving}
        onSave={(input) =>
          dialog.kind === 'edit'
            ? mutations.update(dialog.row.id, input, { onSuccess: closeDialog })
            : mutations.add(input, { onSuccess: closeDialog })
        }
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('bodyStats.delete.title')}
        description={
          deleting
            ? t('bodyStats.delete.description', {
                date: format.date(deleting.date),
                weight: format.measure(deleting.weight, 'kg', 1),
              })
            : ''
        }
        confirmLabel={t('bodyStats.delete.confirm')}
        busy={mutations.isDeleting}
        onConfirm={() =>
          deleting && mutations.remove(deleting.id, { onSettled: () => setDeleting(null) })
        }
      />
    </Stack>
  )
}

export function BodyStatsPage() {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<Dialog>({ kind: 'closed' })
  const [fetchKey, setFetchKey] = useState(0)

  return (
    <Page title={t('nav.bodyStats')}>
      <QueryBoundary
        onRetry={() => startTransition(() => setFetchKey((key) => key + 1))}
        fallback={<BodyStatsSkeleton />}
        errorMessage={t('bodyStats.loadFailed')}
      >
        <BodyStatsContent fetchKey={fetchKey} dialog={dialog} onDialogChange={setDialog} />
      </QueryBoundary>
    </Page>
  )
}
