using Athlify.Api.Database;
using Athlify.Api.Models;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Queries;

/// <summary>Resolves <see cref="BodyStats"/> for the Relay <c>node(id:)</c> query.</summary>
public static class BodyStatsNode
{
    public static async Task<BodyStats?> GetAsync(
        [ID<BodyStats>] int id,
        InMemoryDb db,
        CancellationToken cancellationToken)
    {
        return await db.BodyStats
            .Include(b => b.Comments)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }
}
