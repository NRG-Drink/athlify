using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

[MutationType]
public sealed partial class ActivityMergeMutation(ActivityMergeNode activityMergeNode, MergeMembership mergeMembership)
{
    public async Task<ActivityMerge> CreateActivityMerge(
        string? name,
        [ID<Activity>] IReadOnlyList<int> activityIds,
        QueryContext<ActivityMerge> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var errors = new ValidationErrors();
        errors.Text(name, "Name", MergeMembership.MaxNameLength, required: false);
        errors.AddIf(activityIds.Distinct().Count() < MergeMembership.MinimumMembers,
            $"A merge needs at least {MergeMembership.MinimumMembers} activities.");
        errors.ThrowIfAny();

        var activities = await Links.LoadAllAsync(db.Activities, activityIds, "Activity", cancellationToken);
        mergeMembership.ThrowIfMergedElsewhere(activities, mergeId: null);

        var merge = new ActivityMerge { Name = Text.OrNull(name), Activities = activities };
        mergeMembership.Refresh(merge, db);
        db.ActivityMerges.Add(merge);
        await db.SaveChangesAsync(cancellationToken);
        return (await activityMergeNode.GetAsync(merge.Id, query, db, cancellationToken))!;
    }

    public async Task<ActivityMerge?> RenameActivityMerge(
        [ID<ActivityMerge>] int id,
        string? name,
        QueryContext<ActivityMerge> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var errors = new ValidationErrors();
        errors.Text(name, "Name", MergeMembership.MaxNameLength, required: false);
        errors.ThrowIfAny();

        var merge = await db.ActivityMerges.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (merge is null)
        {
            return null;
        }

        merge.Name = Text.OrNull(name);
        await db.SaveChangesAsync(cancellationToken);
        return await activityMergeNode.GetAsync(id, query, db, cancellationToken);
    }

    public async Task<ActivityMerge?> AddActivityToMerge(
        [ID<ActivityMerge>] int mergeId,
        [ID<Activity>] int activityId,
        QueryContext<ActivityMerge> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var merge = await mergeMembership.LoadAsync(db, mergeId, cancellationToken);
        if (merge is null)
        {
            return null;
        }

        var activity = (await Links.LoadAllAsync(db.Activities, [activityId], "Activity", cancellationToken)).Single();
        mergeMembership.ThrowIfMergedElsewhere([activity], mergeId);
        if (activity.MergeId is null)
        {
            merge.Activities.Add(activity);
        }

        mergeMembership.Refresh(merge, db);
        await db.SaveChangesAsync(cancellationToken);
        return await activityMergeNode.GetAsync(mergeId, query, db, cancellationToken);
    }

    public async Task<ActivityMerge?> RemoveActivityFromMerge(
        [ID<ActivityMerge>] int mergeId,
        [ID<Activity>] int activityId,
        QueryContext<ActivityMerge> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var merge = await mergeMembership.LoadAsync(db, mergeId, cancellationToken);
        if (merge is null)
        {
            return null;
        }

        var activity = merge.Activities.FirstOrDefault(a => a.Id == activityId && a.DeletedAt is null)
            ?? throw DomainErrors.Validation("The activity is not part of this merge.");
        merge.Activities.Remove(activity);

        var kept = mergeMembership.Refresh(merge, db);
        await db.SaveChangesAsync(cancellationToken);
        return kept ? await activityMergeNode.GetAsync(mergeId, query, db, cancellationToken) : null;
    }

    [ID<ActivityMerge>]
    public async Task<int?> DeleteActivityMerge(
        [ID<ActivityMerge>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var merge = await mergeMembership.LoadAsync(db, id, cancellationToken);
        if (merge is null)
        {
            return null;
        }

        merge.Activities.Clear();
        db.ActivityMerges.Remove(merge);
        await db.SaveChangesAsync(cancellationToken);
        return id;
    }
}
