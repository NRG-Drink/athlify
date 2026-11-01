/** Server-side order of a list, as kept in the URL (`?sort=weight`, `?sort=-weight`). */
export interface ListSort<C extends string = string> {
  column: C
  desc: boolean
}

export const SORT_PARAM = 'sort'

export function isSortColumn<C extends string>(columns: readonly C[], value: string): value is C {
  return columns.some((column) => column === value)
}

/** Reads the `sort` parameter (user-controlled input); a missing or unknown column falls back. */
export function parseSort<C extends string>(
  raw: string | null,
  columns: readonly C[],
  fallback: ListSort<C>,
): ListSort<C> {
  const desc = raw?.startsWith('-') ?? false
  const name = (desc ? raw?.slice(1) : raw) ?? ''
  return isSortColumn(columns, name) ? { column: name, desc } : fallback
}

/** Writes `sort` into the parameters; the default order is left out to keep links short. */
export function applySort<C extends string>(
  params: URLSearchParams,
  sort: ListSort<C>,
  fallback: ListSort<C>,
): URLSearchParams {
  const next = new URLSearchParams(params)
  if (sort.column === fallback.column && sort.desc === fallback.desc) next.delete(SORT_PARAM)
  else next.set(SORT_PARAM, `${sort.desc ? '-' : ''}${sort.column}`)
  return next
}

type SortDirection = 'ASC' | 'DESC'

/**
 * `order` of a GraphQL connection. It ends with the id, so rows with equal values page without
 * gaps or repeats. `fields` maps a column to its API field where the names differ.
 */
export function sortToOrder<C extends string>(
  sort: ListSort<C>,
  fields: Partial<Record<C, string>> = {},
): Record<string, SortDirection>[] {
  const direction: SortDirection = sort.desc ? 'DESC' : 'ASC'
  return [{ [fields[sort.column] ?? sort.column]: direction }, { id: 'DESC' }]
}
