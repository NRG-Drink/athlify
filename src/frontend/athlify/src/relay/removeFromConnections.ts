import { commitLocalUpdate, ConnectionHandler, type IEnvironment } from 'relay-runtime'

/**
 * Removes a record the server confirmed as deleted (or gone): out of each given connection that
 * holds it, lowering that connection's `totalCount`, and out of the store, so other fields that
 * pointed to it read null.
 *
 * Call it from `onCompleted` after checking `errors`, never from a mutation `updater`: an updater
 * also runs for a payload with errors, where a `null` field means "failed", not "gone".
 */
export function removeFromConnections(
  environment: IEnvironment,
  connectionIds: readonly string[],
  id: string,
) {
  commitLocalUpdate(environment, (store) => {
    for (const connectionId of connectionIds) {
      const connection = store.get(connectionId)
      const edges = connection?.getLinkedRecords('edges') ?? []
      if (!connection || !edges.some((edge) => edge?.getLinkedRecord('node')?.getDataID() === id))
        continue
      ConnectionHandler.deleteNode(connection, id)
      const count = connection.getValue('totalCount')
      if (typeof count === 'number') connection.setValue(Math.max(0, count - 1), 'totalCount')
    }
    store.delete(id)
  })
}
