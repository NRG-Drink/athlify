# Events Table Comparison: TanStack Table and AG Grid

## Scope

The comparison has three routes. `/events` is the TanStack Table showcase;
`/ag-events` is the richer AG Grid Community showcase. Both load the complete
Relay cursor connection and apply local table interactions. `/events/ag-grid`
retains the original server-filtered AG Grid route for comparing that
data-loading approach. The two showcases use the same Event fields and load
cursor pages in batches of 200 before treating filters, sorting and export as
complete.

The routes use `@tanstack/react-table` 9.3.1 and `ag-grid-community` /
`ag-grid-react` 36.3.0.

## TanStack Table showcase

The `/events` page uses TanStack Table's client-side row models with:

- a global quick filter that searches every Event field, including hidden
  columns;
- per-column header menus with substring text filters, an exact type filter,
  and inclusive start/end date ranges that also accept a single boundary;
- multi-column sorting with Shift-click, starting with newest start date;
- virtualized row rendering with a fixed-height scroll viewport;
- resizable columns with pointer dragging and keyboard arrow-key controls;
- a sticky, non-hideable Event name column that stays visible while scrolling
  horizontally;
- an optional-column chooser for the remaining fields;
- app-generated CSV export of the filtered, sorted rows and visible columns.

TanStack Table supplies the table state and row-model operations, while
Athlify supplies the controls, markup, localization and CSV download. The
rows are virtualized in the browser so the full locally loaded list can be
filtered and sorted without rendering every matching row at once.

## AG-Events showcase

The `/ag-events` showcase uses AG Grid Community's Client-Side Row Model with:

- quick filtering across displayed values;
- text filters for Event name, type, description and tags;
- date filters for start and end dates;
- multi-column sorting, with newest start date as the initial sort;
- resizable and movable columns, plus a column chooser for optional fields;
- client-side pagination with selectable page sizes; and
- CSV export of the filtered, sorted result.

All Relay cursor pages are loaded so local filters and exports operate on the
complete Event list. If a later page fails, the page reports that filtering and
export currently cover only loaded records and offers a retry. The per-column
chooser is a small app control backed by the grid API; the Enterprise-only
Columns Tool Panel is not used. This is a good fit for a personal Event list
and for evaluating AG Grid, but it transfers the full list to the browser.
Very large datasets would need a different loading strategy; AG Grid's
Server-Side Row Model is an Enterprise feature.

## Key differences

| Area                      | TanStack Table                                                                                                                        | AG Grid Community                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering model           | Headless table state and row models; Athlify supplies semantic markup, controls, styling and row virtualization.                        | Rendered grid with built-in headers, cells, sorting, resizing, filtering and virtualization behavior.                                                            |
| UI customization          | Fine-grained control over Chakra markup, layout, accessibility and interaction.                                                       | Theme parameters and column configuration cover common needs; deeper visual changes must work with the grid's structure.                                        |
| Sorting                   | Multi-column client sorting; Shift-click adds a sort, with a small custom indicator for sort order.                                   | Built-in multi-column sorting UI; AG-Events also enables sorting multiple columns without a modifier key.                                                       |
| Filtering                 | Global search plus header-menu text and type filters, and inclusive date ranges with either boundary optional.                         | AG-Events provides a global quick filter and native text/date filters, including date ranges and blank-value options.                                           |
| Row rendering             | TanStack Virtual renders only visible rows plus overscan from the fully loaded connection.                                               | AG Grid renders its client-side row model with built-in virtualization.                                                                                         |
| Column controls           | App-rendered chooser toggles visibility; columns resize by dragging or keyboard; Event name stays pinned.                             | Resizing and movement are built in; AG-Events adds an optional-column chooser backed by the grid API.                                                           |
| Export                    | App-generated CSV exports filtered, sorted rows and visible columns.                                                                  | AG-Events uses the Community CSV export API for filtered and sorted rows.                                                                                        |
| Bundle                    | Headless table logic; does not include a rendered grid.                                                                               | The lazy AG Grid chunk is about 1.2 MB minified (338 kB gzip); it exceeds Vite's 500 kB warning threshold and is loaded only on grid routes.                     |
| Accessibility and styling | Uses the application's semantic table and Chakra design system, with app-owned interactions to maintain.                             | Uses the grid's ARIA grid interaction model and theme system; it needs separate integration and accessibility checks.                                           |
| Licensing                 | MIT-licensed open-source project.                                                                                                     | Community edition is open source; Enterprise capabilities require a commercial license.                                                                         |

## Pros and cons

### TanStack Table

**Pros**

- Keeps Athlify in control of the rendered table, responsive behavior, semantic
  markup, keyboard interactions and Chakra styling.
- Keeps the client bundle smaller and lets the app add only the interactions it
  needs.
- Provides composable filtering, sorting, virtualization and visibility state
  without imposing a separate grid UI.

**Cons**

- Requires application code for table markup, sort controls, empty states,
  column controls and export.
- Feature state is flexible but each desired user interaction needs a small,
  accessible application UI; the library does not provide a complete grid.

### AG Grid Community

**Pros**

- Provides a working grid UI with native sorting, column filters, pagination,
  resizable and movable columns, and row virtualization.
- Column definitions make a conventional data grid quick to configure; the
  Community CSV export needs no extra package.
- AG-Events demonstrates a rich interaction set without implementing each
  row-model operation and control from scratch.
- Community functionality is available without an Enterprise license.

**Cons**

- Adds a distinct grid theme and interaction model that must be reconciled with
  Athlify's Chakra theme, responsive layout and accessibility requirements.
- Adds a sizable client chunk; the current build lazy-loads it so users of the
  TanStack route do not download AG Grid.
- The Client-Side Row Model filters, sorts, paginates and exports only rows
  loaded into the browser. AG-Events therefore loads all Relay cursor pages;
  that is suitable for the current personal Event list but should be revisited
  if its size grows substantially.
- Advanced capabilities, including the Server-Side Row Model, require
  Enterprise; a license is needed if the product later depends on them.

## Implementation effort

For a conventional local-data grid, AG Grid is quicker to get running because
its grid UI, filters, pagination and CSV export are provided. TanStack requires
app code for the controls and export, but the row-model setup remains compact
and lets Athlify keep its own semantic table and design system. The standard
`/events/ag-grid` route still demonstrates the shared server-side filters and
cursor pagination with little custom table behavior.

## User experience

Both showcases work over the full Event list, so their local filters, sorts,
exports and virtualized results are complete once loading finishes. TanStack
presents those features in a custom Chakra table; AG Grid provides more native grid
controls, richer date-filter options and built-in export. The simpler
`/events/ag-grid` route remains server-filtered and avoids loading the entire
connection before interaction.

## Recommendation

Keep TanStack Table as the default `/events` implementation for Athlify. The
page demonstrates sorting, filtering, virtualized rendering, column visibility
and CSV export without adopting a full grid or giving up Chakra's semantic
markup. Keep `/ag-events` as the feature-rich AG Grid comparison and
`/events/ag-grid` as the server-filtered AG Grid variant. Choose AG Grid for
production if its built-in controls and richer filters justify the larger
bundle and grid interaction model. Confirm licensing before adopting any
Enterprise-only capability.

## Sources

- [TanStack Table introduction](https://tanstack.com/table/latest/docs/introduction)
- [TanStack Table sorting](https://tanstack.com/table/latest/docs/guide/sorting)
- [TanStack Table column filtering](https://tanstack.com/table/latest/docs/guide/column-filtering)
- [AG Grid React documentation](https://www.ag-grid.com/react-data-grid/)
- [AG Grid row models](https://www.ag-grid.com/react-data-grid/row-models/)
- [AG Grid licensing](https://www.ag-grid.com/license-pricing/)
