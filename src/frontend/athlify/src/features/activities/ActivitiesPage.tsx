import { Button, Stack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
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
import { activeActivityFilterKeys, type ActivityFilters } from './activityFilters'
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
import { enumLabel, vehicleLabel } from './activityFormatting'
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
          brand
          model
          nickname
        }
      }
    }
  }
`

type Option = { id: string; label: string }
type Equipment = { id: string; brand: string; model: string; nickname?: string | null }

const equipmentOptions = (items: readonly Equipment[] | null | undefined): Option[] =>
  items?.map((item) => ({ id: item.id, label: vehicleLabel(item) })) ?? []

/**
 * The loaded choices plus those of the activity in the form. A bicycle, gadget or tag beyond the
 * first 200 choices then still shows its name and is kept when saving.
 */
function withChoices(options: readonly Option[], current: readonly Option[]) {
  const missing = current.filter((item) => !options.some((option) => option.id === item.id))
  return missing.length > 0 ? [...options, ...missing] : options
}

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
  // Set when the confirmed delete went through: the row and its menu are gone, so the focus moves
  // to the count line instead of returning to the menu button.
  const deleted = useRef(false)
  // `totalCount` before a create; the refetch after it tells whether the filters show the new one.
  const countBeforeCreate = useRef<number | null>(null)
  const mutations = useActivityMutations(data.activities.__id)

  const activities = useMemo(
    () => data.activities?.edges?.map((edge) => edge.node) ?? [],
    [data.activities],
  )
  const vehicles = useMemo(() => equipmentOptions(queryData.vehicles?.nodes), [queryData.vehicles])
  const gadgets = useMemo(() => equipmentOptions(queryData.gadgets?.nodes), [queryData.gadgets])
  const tags = useMemo(
    () => queryData.tags?.nodes?.map((tag) => ({ id: tag.id, label: tag.name })) ?? [],
    [queryData.tags],
  )
  const hasMoreVehicles = queryData.vehicles?.pageInfo.hasNextPage ?? false
  const hasMoreGadgets = queryData.gadgets?.pageInfo.hasNextPage ?? false
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

  const resetFilters = useCallback(() => changeFilters({}), [changeFilters])
  const closeDialog = () => onDialogChange({ kind: 'closed' })
  const edit = useCallback(
    (row: ActivityRow) => onDialogChange({ kind: 'edit', row }),
    [onDialogChange],
  )
  const duplicate = useCallback(
    (row: ActivityRow) => onDialogChange({ kind: 'duplicate', row }),
    [onDialogChange],
  )
  const confirmDelete = useCallback((row: ActivityRow) => {
    deleted.current = false
    setDeleting(row)
  }, [])

  const totalCount = data.activities?.totalCount ?? 0

  // After the refetch that follows a create: the count only grows when the filters show the new one.
  useEffect(() => {
    if (isRefetching || countBeforeCreate.current === null) return
    const shown = totalCount > countBeforeCreate.current
    countBeforeCreate.current = null
    toaster.create({
      type: 'success',
      title: t(shown ? 'activities.add.success' : 'activities.add.hiddenByFilters'),
    })
  }, [isRefetching, totalCount, t])

  /**
   * Only the server knows where a new activity belongs in the sorted, filtered list and what the
   * count is now, so the list is loaded again, as far as it was loaded. The transition keeps the
   * current rows (dimmed) until the new ones are there.
   */
  const created = () => {
    closeDialog()
    countBeforeCreate.current = totalCount
    startRefetch(() => {
      refetch(
        { first: Math.max(PAGE_SIZE, activities.length + 1) },
        { fetchPolicy: 'network-only' },
      )
    })
  }

  const save = (input: ActivityFormInput) => {
    if (dialog.kind === 'edit') mutations.update(dialog.row.id, input, { onSuccess: closeDialog })
    else mutations.create(input, { onSuccess: created })
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

  const deleteDescription = (row: ActivityRow) =>
    t('activities.delete.description', {
      context: row.merge ? 'merged' : undefined,
      date: format.date(row.date),
      name: row.description || enumLabel(t, 'types', row.type),
    })

  // The bicycle, gadgets and tags of the activity in the form, with their names.
  const formChoices = useMemo(() => {
    const row = dialog.kind === 'closed' || dialog.kind === 'create' ? undefined : dialog.row
    const vehicle = row ? row.vehicle : latest?.vehicle
    return {
      vehicles: withChoices(vehicles, equipmentOptions(vehicle ? [vehicle] : [])),
      gadgets: withChoices(gadgets, equipmentOptions(row?.gadgets)),
      tags: withChoices(tags, row?.tags.map((tag) => ({ id: tag.id, label: tag.name })) ?? []),
      hasMoreGadgets,
      hasMoreTags,
    }
  }, [dialog, latest, vehicles, gadgets, tags, hasMoreGadgets, hasMoreTags])

  const emptyMessage = useMemo(
    () => (
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
    ),
    [t, resetFilters],
  )

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
        options={formChoices}
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
          deleting &&
          mutations.remove(deleting.id, {
            onSettled: (removed) => {
              deleted.current = removed
              setDeleting(null)
            },
          })
        }
        // Without a delete (cancel, error) the focus returns to the menu button.
        finalFocusEl={() => (deleted.current ? countRef.current : null)}
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
        totalCount={totalCount}
        busy={refreshing || isRefetching}
        onEdit={edit}
        onDuplicate={duplicate}
        onDelete={confirmDelete}
        countRef={countRef}
        emptyMessage={emptyMessage}
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
