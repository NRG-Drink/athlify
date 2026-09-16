using Athlify.Api.Database;
using Athlify.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Queries;

[MutationType]
public static partial class BodyStatsMutation
{
    public static async Task<BodyStats> AddBodyStats(
        BodyStatsDto bodyStats,
        InMemoryDb db,
        CancellationToken cancellationToken)
    {
        var bodyStatsObj = new BodyStats(bodyStats);
        var res = await db.BodyStats.AddAsync(bodyStatsObj, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return res.Entity;
    }

    public static async Task<BodyStats?> UpdateBodyStats(
        int id,
        BodyStatsDto bodyStats,
        InMemoryDb db,
        CancellationToken cancellationToken)
    {
        var existing = await db.BodyStats.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        db.Entry(existing).CurrentValues.SetValues(bodyStats);
        await db.SaveChangesAsync(cancellationToken);

        var updated = await db.BodyStats.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        return updated;
    }

    public static async Task<bool> DeleteBodyStats(
        int id,
        InMemoryDb db,
        CancellationToken cancellationToken)
    {
        var existing = await db.BodyStats.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (existing is null)
        {
            return false;
        }

        db.BodyStats.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
