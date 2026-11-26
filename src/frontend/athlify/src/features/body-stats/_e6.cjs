const fs = require('fs')
function ed(f, a, b) {
  let s = fs.readFileSync(f, 'utf8')
  if (!s.includes(a)) throw new Error(f + ' missing ' + a.slice(0, 50))
  fs.writeFileSync(f, s.replace(a, b))
}

ed(
  'BodyStatsGridState.ts',
  "const bodyStatsFilterColumnIds = [\n  'date',",
  "const bodyStatsFilterColumnIds = [\n  'id',\n  'date',",
)
ed(
  'BodyStatsGridState.ts',
  "export const bodyStatsSortableColumnIds = [...bodyStatsFilterColumnIds, 'id'] as const",
  'export const bodyStatsSortableColumnIds = bodyStatsFilterColumnIds',
)

ed(
  'BodyStatsGridFilterParams.ts',
  'export const createBodyStatsNumberFilterParams',
  `const isEqualityOption = (option: unknown) =>
  option === 'equals' ||
  option === 'notEqual' ||
  (typeof option === 'object' && option !== null && 'displayKey' in option && option.displayKey === 'none')

export const createBodyStatsIdFilterParams = (t: TFunction) => {
  const params = createGridNumberFilterParams(t, 'bodyStats')
  return { ...params, filterOptions: params.filterOptions.filter(isEqualityOption) }
}

export const createBodyStatsNumberFilterParams`,
)

ed(
  'BodyStatsGridColumns.tsx',
  "      width: 100,\n      hide: true,\n      filter: false,\n",
  "      width: 100,\n      hide: true,\n      filter: 'agNumberColumnFilter',\n      filterParams: idFilterParams,\n",
)
ed(
  'BodyStatsGridColumns.tsx',
  '  const numberFilterParams = createBodyStatsNumberFilterParams(t)\n',
  '  const numberFilterParams = createBodyStatsNumberFilterParams(t)\n  const idFilterParams = createBodyStatsIdFilterParams(t)\n',
)
ed(
  'BodyStatsGridColumns.tsx',
  '  createBodyStatsDateFilterParams,\n',
  '  createBodyStatsDateFilterParams,\n  createBodyStatsIdFilterParams,\n',
)

ed(
  'BodyStatsGridQuery.ts',
  'function getTextFilter(',
  `function getIdFilter({ type = 'equals', filter }: GridFilter): BodyStatsFilterInput | null {
  if (typeof filter !== 'number' || !Number.isSafeInteger(filter)) return null
  const globalId = btoa(\`BodyStats:\${filter}\`)
  if (type === 'equals') return { id: { eq: globalId } }
  if (type === 'notEqual') return { id: { neq: globalId } }
  return null
}

function getTextFilter(`,
)
ed(
  'BodyStatsGridQuery.ts',
  "    else if (field === 'date') clause = getDateFilter(filter)",
  "    else if (field === 'id') clause = getIdFilter(filter)\n    else if (field === 'date') clause = getDateFilter(filter)",
)
