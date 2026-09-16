using Athlify.Api.Database;
using Athlify.Api.Models;
using GreenDonut.Data;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Queries;

[QueryType]
public static partial class BodyStatsQuery
{
    public static async Task<BodyStats?> GetBodyStatsById(
        int id,
        InMemoryDb db,
        CancellationToken cancellationToken)
    {
        var result = await db.BodyStats
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
            .OrderBy(b => b.Id)
            .With(query.Include(e => e.Id))
            .ToListAsync(cancellationToken);

        return result;
    }
}

