using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Body;

[MutationType]
public static partial class BodyStatsMutation
{
    public static async Task<BodyStats> AddBodyStats(
        BodyStatsInput bodyStats,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        BodyStatsValidation.ThrowIfInvalid(bodyStats);

        var created = new BodyStats();
        ApplyFields(created, bodyStats);
        db.BodyStats.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return created;
    }

    public static async Task<BodyStats?> UpdateBodyStats(
        [ID<BodyStats>] int id,
        BodyStatsInput bodyStats,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        BodyStatsValidation.ThrowIfInvalid(bodyStats);

        var existing = await db.BodyStats
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        ApplyFields(existing, bodyStats);
        await db.SaveChangesAsync(cancellationToken);
        return existing;
    }

    [ID<BodyStats>]
    public static async Task<int?> DeleteBodyStats(
        [ID<BodyStats>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var existing = await db.BodyStats
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        db.BodyStats.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    private static void ApplyFields(BodyStats target, BodyStatsInput input)
    {
        target.Date = UtcDateTime.Normalize(input.Date);
        target.Weight = input.Weight;
        target.BodyFatPercentage = input.BodyFatPercentage;
        target.MusclePercentage = input.MusclePercentage;
        target.WaterPercentage = input.WaterPercentage;
        target.BoneMass = input.BoneMass;
        target.Comment = string.IsNullOrWhiteSpace(input.Comment) ? null : input.Comment;
    }
}
