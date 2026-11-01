import { Button, Stack } from '@chakra-ui/react'
import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { graphql, useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuBike, LuPlus, LuRotateCcw } from 'react-icons/lu'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Page, PageEmptyState } from '../../components/Page'
import { toaster } from '../../components/ui/toaster'
import { useFormat } from '../../i18n/useFormat'
import { DataTableSkeleton } from '../../components/DataTableSkeleton'
import { QueryBoundary } from '../../components/QueryBoundary'
import { useFetchKey } from '../../relay/useFetchKey'
import { useLoadMore } from '../../relay/useLoadMore'
import { useParamsRefresh } from '../../relay/useParamsRefresh'
import {
  activeActivityFilterKeys,
  matchesActivityFilters,
  type ActivityFilters,
} from './activityFilters'
import { activityToValues, newActivityValues, type ActivityFormInput } from './activityForm'
import { ActivityFormDialog } from './ActivityFormDialog'
import {
  activityQueryVariables,
  applyActivityQuery,
  parseActivityQuery,
  type ActivityQuery,
  type ActivitySort,
} from './activityQuery'
import { ActivitiesFilterSummary } from './ActivitiesFilterSummary'
import { ActivitiesTable, type ActivityRow } from './ActivitiesTable'
import { useActivityMutations } from './useActivityMutations'
import { vehicleLabel } from './activityFormatting'
import type { ActivitiesPage_list$key } from './__generated__/ActivitiesPage_list.graphql'
import type { ActivitiesPageQuery } from './__generated__/ActivitiesPageQuery.graphql'
import type { ActivitiesPageMoreQuery } from './__generated__/ActivitiesPageMoreQuery.graphql'

const PAGE_SIZE = 50

const pageQuery = graphql`
  query ActivitiesPageQuery(
    $first: Int = 50
    $where: ActivityFilterInput
    $order: [ActivitySortInput!]
  ) {
    ...ActivitiesPage_list @arguments(first: $first, where: $where, order: $order)
    vehicles(first: 200) {
      nodes {
        id
        brand
        model
        nickname
      }
      pageInfo {
        hasNextPage
      }
    }
    gadgets(first: 200) {
      nodes {
        id
        brand
        model
        nickname
      }
      pageInfo {
        hasNextPage
      }
    }
    tags(first: 200) {
      nodes {
        id
        name
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`

const listFragment = graphql`
  fragment ActivitiesPage_list on Query
  @refetchable(queryName: "ActivitiesPageMoreQuery")
  @argumentDefinitions(
    first: { type: "Int", defaultValue: 50 }
    after: { type: "String" }
    where: { type: "ActivityFilterInput" }
    order: { type: "[ActivitySortInput!]" }
  ) {
    activities(first: $first, after: $after, where: $where, order: $order)
      @connection(key: "ActivitiesPage_activities") {
      __id
      totalCount
      edges {
        node {
          id
          ...ActivitiesTable_entries
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    # The most recent activity regardless of filters: a new one starts with its type and bicycle.
    latest: activities(first: 1, order: [{ date: DESC }, { id: DESC }]) {
      nodes {
        id
        type
        vehicle {
          id
        }
      }
    }
  }
`

/** Which form is open; duplicate and edit start from a row. */
type Dialog =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'duplicate'; row: ActivityRow }
  | { kind: 'edit'; row: ActivityRow }

interface ContentProps {
  fetchKey: number
  dialog: Dialog
  onDialogChange: (dialog: Dialog) => void
}

function ActivitiesContent({ fetchKey, dialog, onDialogChange }: ContentProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const { searchParams, replaceParams, refreshing } = useParamsRefresh()
  const query = useMemo(() => parseActivityQuery(searchParams), [searchParams])
  const { filters, sort } = query
  const variables = useMemo(() => ({ first: PAGE_SIZE, ...activityQueryVariables(query) }), [query])
  const queryData = useLazyLoadQuery<ActivitiesPageQuery>(pageQuery, variables, {
    fetchKey,
    fetchPolicy: 'network-only',
  })
  const { data, hasNext, isLoadingNext, loadNext, refetch } = usePaginationFragment<
    ActivitiesPageMoreQuery,
    ActivitiesPage_list$key
  >(listFragment, queryData)
  const [isRefetching, startRefetch] = useTransition()
  const [deleting, setDeleting] = useState<ActivityRow | null>(null)
  const countRef = useRef<HTMLParagraphElement>(null)
  const mutations = useActivityMutations(data.activities.__id)

  const activities = useMemo(
    () => data.activities?.edges?.map((edge) => edge.node) ?? [],
    [data.activities],
  )
  const options = (nodes: readonly { id: string; label: string }[] | undefined) => nodes ?? []
  const vehicles = useMemo(
    () =>
      options(
        queryData.vehicles?.nodes?.map((vehicle) => ({
          id: vehicle.id,
          label: vehicleLabel(vehicle),
        })),
      ),
    [queryData.vehicles],
  )
  const gadgets = useMemo(
    () =>
      options(
        queryData.gadgets?.nodes?.map((gadget) => ({
          id: gadget.id,
          label: vehicleLabel(gadget),
        })),
      ),
    [queryData.gadgets],
  )
  const tags = useMemo(
    () => options(queryData.tags?.nodes?.map((tag) => ({ id: tag.id, label: tag.name }))),
    [queryData.tags],
  )
  const hasMoreVehicles = queryData.vehicles?.pageInfo.hasNextPage ?? false
  const hasMoreTags = queryData.tags?.pageInfo.hasNextPage ?? false
  const latest = data.latest?.nodes?.[0]

  const { loadMore, loadMoreError, setLoadMoreError } = useLoadMore(
    loadNext,
    isLoadingNext,
    PAGE_SIZE,
  )

  const changeQuery = useCallback(
    (next: ActivityQuery) => {
      setLoadMoreError(false)
      replaceParams(applyActivityQuery(searchParams, next))
    },
    [searchParams, replaceParams, setLoadMoreError],
  )
  const changeFilters = useCallback(
    (next: ActivityFilters) => changeQuery({ ...query, filters: next }),
    [changeQuery, query],
  )
  const changeSort = useCallback(
    (next: ActivitySort) => changeQuery({ ...query, sort: next }),
    [changeQuery, query],
  )

  const resetFilters = () => changeFilters({})
  const closeDialog = () => onDialogChange({ kind: 'closed' })

  /**
   * Only the server knows where a new activity belongs in the sorted, filtered list and what the
   * count is now, so the list is loaded again, as far as it was loaded. The transition keeps the
   * current rows (dimmed) until the new ones are there.
   */
  const created = (input: ActivityFormInput) => {
    closeDialog()
    const hidden = !matchesActivityFilters(filters, input)
    toaster.create({
      type: 'success',
      title: t(hidden ? 'activities.add.hiddenByFilters' : 'activities.add.success'),
    })
    startRefetch(() => {
      refetch(
        { first: Math.max(PAGE_SIZE, activities.length + 1) },
        { fetchPolicy: 'network-only' },
      )
    })
  }

  const save = (input: ActivityFormInput) => {
    if (dialog.kind === 'edit') mutations.update(dialog.row.id, input, { onSuccess: closeDialog })
    else mutations.create(input, { onSuccess: () => created(input) })
  }

  const initialValues = useMemo(() => {
    switch (dialog.kind) {
      case 'edit':
        return activityToValues(dialog.row)
      case 'duplicate':
        return activityToValues(dialog.row, { asCopy: true })
      default:
        return newActivityValues({ type: latest?.type, vehicleId: latest?.vehicle?.id })
    }
  }, [dialog, latest])

  const deleteDescription = (row: ActivityRow) => {
    const text = t('activities.delete.description', {
      date: format.date(row.date),
      name: row.description || t(`activities.types.${row.type}`),
    })
    return row.merge ? `${text} ${t('activities.delete.mergeWarning')}` : text
  }

  const filtered = activeActivityFilterKeys(filters).length > 0

  const dialogs = (
    <>
      <ActivityFormDialog
        open={dialog.kind !== 'closed'}
        onOpenChange={(open) => !open && closeDialog()}
        mode={dialog.kind === 'closed' ? 'create' : dialog.kind}
        initialValues={initialValues}
        calculated={
          dialog.kind === 'edit'
            ? {
                averageSpeed: dialog.row.averageSpeed,
                tss: dialog.row.tss,
                source: dialog.row.source,
              }
            : undefined
        }
        options={{
          vehicles,
          gadgets,
          tags,
          hasMoreVehicles,
          hasMoreGadgets: queryData.gadgets?.pageInfo.hasNextPage ?? false,
          hasMoreTags,
        }}
        busy={mutations.isSaving}
        onSave={save}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('activities.delete.title')}
        description={deleting ? deleteDescription(deleting) : ''}
        confirmLabel={t('activities.delete.confirm')}
        busy={mutations.isDeleting}
        onConfirm={() =>
          deleting && mutations.remove(deleting.id, { onSettled: () => setDeleting(null) })
        }
        // The row and its menu are gone after a delete; the count line says what changed.
        finalFocusEl={() => countRef.current}
      />
    </>
  )

  // Without filters an empty list is the first-use state: nothing to filter, so no table.
  if (activities.length === 0 && !filtered) {
    return (
      <>
        <PageEmptyState
          icon={LuBike}
          title={t('activities.empty.title')}
          message={t('activities.empty.message')}
          action={
            <Button onClick={() => onDialogChange({ kind: 'create' })}>
              <LuPlus aria-hidden />
              {t('activities.empty.action')}
            </Button>
          }
        />
        {dialogs}
      </>
    )
  }

  return (
    <Stack gap="6">
      <ActivitiesFilterSummary
        value={filters}
        vehicles={vehicles}
        tags={tags}
        hasMoreVehicles={hasMoreVehicles}
        hasMoreTags={hasMoreTags}
        onChange={changeFilters}
        onReset={resetFilters}
      />
      <ActivitiesTable
        entries={activities}
        hasNextPage={hasNext}
        isLoadingNext={isLoadingNext}
        loadMoreError={loadMoreError}
        onLoadMore={loadMore}
        filters={filters}
        vehicles={vehicles}
        tags={tags}
        hasMoreVehicles={hasMoreVehicles}
        hasMoreTags={hasMoreTags}
        onFiltersChange={changeFilters}
        sort={sort}
        onSortChange={changeSort}
        totalCount={data.activities?.totalCount ?? 0}
        busy={refreshing || isRefetching}
        onEdit={(row) => onDialogChange({ kind: 'edit', row })}
        onDuplicate={(row) => onDialogChange({ kind: 'duplicate', row })}
        onDelete={setDeleting}
        countRef={countRef}
        emptyMessage={
          <PageEmptyState
            icon={LuBike}
            title={t('activities.empty.filteredTitle')}
            message={t('activities.empty.filteredMessage')}
            action={
              <Button onClick={resetFilters}>
                <LuRotateCcw aria-hidden />
                {t('activities.filters.reset')}
              </Button>
            }
          />
        }
      />
      {dialogs}
    </Stack>
  )
}

export function ActivitiesPage() {
  const { t } = useTranslation()
  const [fetchKey, retry] = useFetchKey()
  const [dialog, setDialog] = useState<Dialog>({ kind: 'closed' })

  return (
    <Page
      title={t('nav.activities')}
      actions={
        <Button onClick={() => setDialog({ kind: 'create' })}>
          <LuPlus aria-hidden />
          {t('activities.add.open')}
        </Button>
      }
    >
      <QueryBoundary
        onRetry={retry}
        fallback={<DataTableSkeleton />}
        errorMessage={t('activities.loadFailed')}
      >
        <ActivitiesContent fetchKey={fetchKey} dialog={dialog} onDialogChange={setDialog} />
      </QueryBoundary>
    </Page>
  )
}
