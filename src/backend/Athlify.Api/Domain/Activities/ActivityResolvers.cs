using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

[QueryType]
public static partial class ActivityQuery
{
    private static readonly Func<SortDefinition<Activity>, SortDefinition<Activity>> DefaultOrder =
        sort => sort.AddDescending(a => a.Date).AddDescending(a => a.Id);

    /// <summary>Active activities, newest first; soft-deleted ones are never returned.</summary>
    [UseFiltering]
    [UseSorting]
    public static async Task<PageConnection<Activity>> GetActivities(
        PagingArguments pagingArgs,
        QueryContext<Activity> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var page = await db.Activities
            .With(query.Include(a => a.Id), DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        return new PageConnection<Activity>(page);
    }
}

[MutationType]
public static partial class ActivityMutation
{
    public static async Task<Activity> CreateActivity(
        ActivityDto activity,
        QueryContext<Activity> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        ActivityValidation.ThrowIfInvalid(activity, DateTime.UtcNow);
        var created = new Activity();
        await ApplyAsync(created, activity, db, cancellationToken);
        db.Activities.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return (await ActivityNode.GetAsync(created.Id, query, db, cancellationToken))!;
    }

    /// <summary>Updates the editable fields; source, Strava id and calculated values stay server-owned.</summary>
    public static async Task<Activity?> UpdateActivity(
        [ID<Activity>] int id,
        ActivityDto activity,
        QueryContext<Activity> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        ActivityValidation.ThrowIfInvalid(activity, DateTime.UtcNow);
        var existing = await LoadWithMergeAsync(db, id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        await ApplyAsync(existing, activity, db, cancellationToken);
        if (existing.Merge is not null)
        {
            MergeMembership.Refresh(existing.Merge, db);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await ActivityNode.GetAsync(id, query, db, cancellationToken);
    }

    /// <summary>
    /// Soft delete: the activity keeps its data and links but disappears from every view. A merge left with
    /// fewer than two active activities is dissolved.
    /// </summary>
    [ID<Activity>]
    public static async Task<int?> DeleteActivity(
        [ID<Activity>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var existing = await LoadWithMergeAsync(db, id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        existing.DeletedAt = DateTime.UtcNow;
        if (existing.Merge is not null)
        {
            MergeMembership.Refresh(existing.Merge, db);
        }

        await db.SaveChangesAsync(cancellationToken);
        return id;
    }

    /// <summary>An active activity with its tags and, if merged, the merge with all its members.</summary>
    private static Task<Activity?> LoadWithMergeAsync(AthlifyDbContext db, int id, CancellationToken cancellationToken) =>
        db.Activities
            .IgnoreQueryFilters([AthlifyDbContext.NotDeletedFilter])
            .Where(a => a.DeletedAt == null)
            .Include(a => a.Tags)
            .Include(a => a.Merge!)
            .ThenInclude(m => m.Activities)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    private static async Task ApplyAsync(Activity target, ActivityDto dto, AthlifyDbContext db, CancellationToken cancellationToken)
    {
        var vehicle = await Links.LoadOptionalAsync(db.Vehicles, dto.VehicleId, "Bicycle", cancellationToken);
        var tags = await Links.LoadAllAsync(db.Tags, dto.TagIds, "Tag", cancellationToken);

        target.Date = UtcDateTime.Normalize(dto.Date);
        target.Type = dto.Type;
        target.Time = dto.Time;
        target.Distance = dto.Distance;
        target.ElevationGain = dto.ElevationGain;
        target.Description = Text.OrNull(dto.Description);
        target.HeartRateMin = dto.HeartRateMin;
        target.HeartRateMax = dto.HeartRateMax;
        target.HeartRateAverage = dto.HeartRateAverage;
        target.Mood = dto.Mood;
        target.Effort = dto.Effort;
        target.Wind = dto.Wind;
        target.Vehicle = vehicle;
        target.VehicleId = vehicle?.Id;
        Links.ReplaceWith(target.Tags, tags);
        target.Recalculate();
    }
}

public static class ActivityNode
{
    public static Task<Activity?> GetAsync(
        [ID<Activity>] int id,
        QueryContext<Activity> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.Activities, id, query, cancellationToken);
}
