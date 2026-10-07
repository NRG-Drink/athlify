using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

/// <summary>
/// Shows at least two activities as one, without changing them. An activity belongs to at most one merge.
/// The totals cover the active members and are kept up to date by <see cref="MergeMembership"/>.
/// </summary>
[Node(NodeResolverType = typeof(ActivityMergeNode), NodeResolver = nameof(ActivityMergeNode.GetAsync))]
public class ActivityMerge : Entity, IOwned
{
    [GraphQLIgnore]
    public int UserId { get; set; }

    public string? Name { get; set; }

    /// <summary>Active members; soft-deleted activities are hidden by the query filter.</summary>
    public ICollection<Activity> Activities { get; set; } = [];

    /// <summary>Seconds.</summary>
    public int TotalTime { get; set; }

    /// <summary>Kilometers.</summary>
    public double TotalDistance { get; set; }

    /// <summary>Meters; empty when no member has a value.</summary>
    public double? TotalElevationGain { get; set; }

    /// <summary>Empty when no member has a value.</summary>
    public double? TotalTss { get; set; }
}

/// <summary>
/// The merge rules: at least two active members, exclusive membership, totals over active members.
/// Every method works on a merge loaded with <see cref="LoadAsync"/>, so one <c>SaveChanges</c> stores the
/// membership, the totals and a possible dissolution together.
/// </summary>
public static class MergeMembership
{
    public const int MinimumMembers = 2;
    public const int MaxNameLength = 100;

    /// <summary>Loads a merge with every member, soft-deleted ones included.</summary>
    public static Task<ActivityMerge?> LoadAsync(AthlifyDbContext db, int mergeId, CancellationToken cancellationToken) =>
        db.ActivityMerges
            .IgnoreQueryFilters([AthlifyDbContext.NotDeletedFilter])
            .Include(m => m.Activities)
            .FirstOrDefaultAsync(m => m.Id == mergeId, cancellationToken);

    /// <summary>
    /// Recalculates the totals, or dissolves the merge when fewer than two active members remain: all
    /// members, soft-deleted ones included, leave it and the merge is deleted. Returns <c>false</c> when it
    /// was dissolved.
    /// </summary>
    public static bool Refresh(ActivityMerge merge, AthlifyDbContext db)
    {
        var active = merge.Activities.Where(a => a.DeletedAt is null).ToList();
        if (active.Count < MinimumMembers)
        {
            merge.Activities.Clear();
            db.ActivityMerges.Remove(merge);
            return false;
        }

        merge.TotalTime = active.Sum(a => a.Time);
        merge.TotalDistance = active.Sum(a => a.Distance);
        merge.TotalElevationGain = SumOrNull(active.Select(a => a.ElevationGain));
        merge.TotalTss = SumOrNull(active.Select(a => a.Tss));
        return true;
    }

    /// <summary>Rejects activities that are already part of another merge.</summary>
    public static void ThrowIfMergedElsewhere(IEnumerable<Activity> activities, int? mergeId)
    {
        if (activities.Any(a => a.MergeId is not null && a.MergeId != mergeId))
        {
            throw DomainErrors.Validation("An activity is already part of another merge. Remove it there first.");
        }
    }

    private static double? SumOrNull(IEnumerable<double?> values)
    {
        var present = values.Where(v => v is not null).ToList();
        return present.Count == 0 ? null : present.Sum();
    }
}
