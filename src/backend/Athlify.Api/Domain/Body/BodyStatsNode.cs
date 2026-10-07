using Athlify.Api.Database;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Body;

/// <summary>Resolves <see cref="BodyStats"/> for the Relay <c>node(id:)</c> query.</summary>
public static class BodyStatsNode
{
    public static async Task<BodyStats?> GetAsync(
        [ID<BodyStats>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        return await db.BodyStats
            .Include(b => b.Comments)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }
}
