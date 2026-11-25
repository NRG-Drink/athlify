using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

/// <summary>
/// The merge rules: at least two active members, exclusive membership, totals over active members.
/// Every method works on a merge loaded with <see cref="LoadAsync"/>, so one <c>SaveChanges</c> stores the
/// membership, the totals and a possible dissolution together.
/// </summary>
public sealed class MergeMembership
{
    public const int MinimumMembers = 2;
    public const int MaxNameLength = 100;

    public Task<ActivityMerge?> LoadAsync(AthlifyDbContext db, int mergeId, CancellationToken cancellationToken) =>
        db.ActivityMerges
            .IgnoreQueryFilters([AthlifyDbContext.NotDeletedFilter])
            .Include(m => m.Activities)
            .FirstOrDefaultAsync(m => m.Id == mergeId, cancellationToken);

    public bool Refresh(ActivityMerge merge, AthlifyDbContext db)
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

    public void ThrowIfMergedElsewhere(IEnumerable<Activity> activities, int? mergeId)
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
