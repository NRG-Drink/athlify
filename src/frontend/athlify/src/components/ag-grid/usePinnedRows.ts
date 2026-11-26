import { useCallback, useMemo, useState } from 'react'

const copyShallow = <TRow>(row: TRow): TRow => ({ ...row })

/** Rows the user pinned to the top of a grid, so they stay visible while the filters change. */
export function usePinnedRows<TRow extends { id: string }>(
  copyRow: (row: TRow) => TRow = copyShallow,
) {
  const [rows, setRows] = useState<TRow[]>([])

  const ids = useMemo(() => new Set(rows.map(({ id }) => id)), [rows])

  const toggle = useCallback(
    (row: TRow) =>
      setRows((current) =>
        current.some(({ id }) => id === row.id)
          ? current.filter(({ id }) => id !== row.id)
          : [...current, copyRow(row)],
      ),
    [copyRow],
  )

  const add = useCallback(
    (row: TRow) =>
      setRows((current) => [...current.filter(({ id }) => id !== row.id), copyRow(row)]),
    [copyRow],
  )

  const update = useCallback(
    (id: string, change: (row: TRow) => TRow) =>
      setRows((current) => current.map((row) => (row.id === id ? change(row) : row))),
    [],
  )

  const remove = useCallback(
    (id: string) => setRows((current) => current.filter((row) => row.id !== id)),
    [],
  )

  return { rows, ids, toggle, add, update, remove }
}
