using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Body;

[MutationType]
public static partial class BodyStatsMutation
{
    public static async Task<BodyStats> AddBodyStats(
        BodyStatsDto bodyStats,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        BodyStatsValidation.ThrowIfInvalid(bodyStats);

        var bodyStatsObj = new BodyStats(bodyStats);
        var res = await db.BodyStats.AddAsync(bodyStatsObj, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return res.Entity;
    }

    public static async Task<BodyStats?> UpdateBodyStats(
        [ID<BodyStats>] int id,
        BodyStatsDto bodyStats,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        BodyStatsValidation.ThrowIfInvalid(bodyStats);

        var existing = await db.BodyStats
            .Include(b => b.Comments)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        existing.Date = UtcDateTime.Normalize(bodyStats.Date);
        existing.Weight = bodyStats.Weight;
        existing.BodyFatPercentage = bodyStats.BodyFatPercentage;
        existing.MusclePercentage = bodyStats.MusclePercentage;
        existing.WaterPercentage = bodyStats.WaterPercentage;
        existing.BoneMass = bodyStats.BoneMass;
        SyncComments(existing, bodyStats.Comments, db);

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
            .Include(b => b.Comments)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        // Remove the notes explicitly: the foreign key does not cascade in an existing database.
        db.Comments.RemoveRange(existing.Comments);
        db.BodyStats.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    private static void SyncComments(
        BodyStats existing,
        IReadOnlyList<CommentDto> incoming,
        AthlifyDbContext db)
    {
        var incomingById = incoming
            .Where(c => c.Id.HasValue)
            .GroupBy(c => c.Id!.Value)
            .ToDictionary(g => g.Key, g => g.Last());

        var unknownIds = incomingById.Keys.Except(existing.Comments.Select(c => c.Id)).ToList();
        if (unknownIds.Count > 0)
        {
            throw new GraphQLException(ErrorBuilder.New()
                .SetMessage("A note does not belong to this entry.")
                .SetCode(BodyStatsValidation.ErrorCode)
                .Build());
        }

        foreach (var comment in existing.Comments.ToList())
        {
            if (!incomingById.TryGetValue(comment.Id, out var edited))
            {
                existing.Comments.Remove(comment);
                db.Comments.Remove(comment);
            }
            else
            {
                // AthlifyDbContext sets ModifiedAt when the content actually changed.
                comment.Content = edited.Content;
            }
        }

        foreach (var added in incoming.Where(c => c.Id is null))
        {
            existing.Comments.Add(new Comment { Content = added.Content });
        }
    }
}
