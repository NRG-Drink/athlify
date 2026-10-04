using Athlify.Api.Database;
using Athlify.Api.Models;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Queries;

[QueryType]
public static partial class BodyStatsQuery
{
    public static async Task<BodyStats?> GetBodyStatsById(
        [ID<BodyStats>] int id,
        InMemoryDb db,
        CancellationToken cancellationToken)
    {
        var result = await db.BodyStats
            .Include(e => e.Comments)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        return result;
    }

    // The id is the tie-breaker, so the cursor is stable for measurements with the same date.
    private static readonly Func<SortDefinition<BodyStats>, SortDefinition<BodyStats>> DefaultOrder =
        sort => sort.AddDescending(b => b.Date).AddDescending(b => b.Id);

    /// <summary>
    /// Relay connection (cursor paging), newest first. A page of 200 stays well inside the query
    /// cost limits; clients that need the whole history load further pages.
    /// </summary>
    [UseFiltering]
    [UseSorting]
    public static async Task<PageConnection<BodyStats>> GetBodyStats(
        PagingArguments pagingArgs,
        QueryContext<BodyStats> query,
        InMemoryDb db,
        CancellationToken cancellationToken)
    {
        var page = await db.BodyStats
            .Include(b => b.Comments)
            .With(query.Include(e => e.Id), DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);

        return new PageConnection<BodyStats>(page);
    }
}
