using Athlify.Api.Database;
using Athlify.Api.Models;
using GreenDonut.Data;
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

    [UseFiltering]
    [UseSorting]
    public static async Task<IEnumerable<BodyStats>> GetBodyStats(
        QueryContext<BodyStats> query,
        InMemoryDb db,
        CancellationToken cancellationToken)
    {
        var result = await db.BodyStats
            .Include(b => b.Comments)
            .OrderByDescending(b => b.Date)
            .With(query.Include(e => e.Id))
            .ToListAsync(cancellationToken);

        return result;
    }
}

