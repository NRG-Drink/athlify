import type { RecordProxy, RecordSourceSelectorProxy } from 'relay-runtime'

// Store updaters for lists that hang directly off the query root (for example
// `bodyStats`). A mutation calls these after the server confirmed the change,
// so the list updates in place instead of being refetched.

/** Puts `record` at the front of the root list `field`; a record that is already listed is not added twice. */
export function appendToRootList(
  store: RecordSourceSelectorProxy,
  field: string,
  record: RecordProxy,
): void {
  const root = store.getRoot()
  const current = root.getLinkedRecords(field) ?? []
  if (current.some((existing) => existing?.getDataID() === record.getDataID())) return
  root.setLinkedRecords([record, ...current], field)
}

/** Removes the record with global `id` from the root list `field` and from the store. */
export function removeFromRootList(
  store: RecordSourceSelectorProxy,
  field: string,
  id: string,
): void {
  const root = store.getRoot()
  const current = root.getLinkedRecords(field)
  if (current) {
    root.setLinkedRecords(
      current.filter((record) => record?.getDataID() !== id),
      field,
    )
  }
  store.delete(id)
}
