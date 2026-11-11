/** The ids with `id` removed when it is there and added when it is not; for multi-selects. */
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]
}
