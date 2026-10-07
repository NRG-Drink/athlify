using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Activities;

[MutationType]
public static partial class ActivityMutation
{
    public static async Task<Activity> CreateActivity(
        ActivityInput activity,
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
        ActivityInput activity,
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

    /// <summary>An active activity with its links and, if merged, the merge with all its members.</summary>
    private static Task<Activity?> LoadWithMergeAsync(AthlifyDbContext db, int id, CancellationToken cancellationToken) =>
        db.Activities
            .IgnoreQueryFilters([AthlifyDbContext.NotDeletedFilter])
            .Where(a => a.DeletedAt == null)
            .Include(a => a.Tags)
            .Include(a => a.Gadgets)
            .Include(a => a.Merge!)
            .ThenInclude(m => m.Activities)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

    private static async Task ApplyAsync(Activity target, ActivityInput input, AthlifyDbContext db, CancellationToken cancellationToken)
    {
        var vehicle = await Links.LoadOptionalAsync(db.Vehicles, input.VehicleId, "Bicycle", cancellationToken);
        var gadgets = await Links.LoadAllAsync(db.Gadgets, input.GadgetIds, "Gadget", cancellationToken);
        var tags = await Links.LoadAllAsync(db.Tags, input.TagIds, "Tag", cancellationToken);

        target.Date = UtcDateTime.Normalize(input.Date);
        target.Type = input.Type;
        target.Time = input.Time;
        target.Distance = input.Distance;
        target.ElevationGain = input.ElevationGain;
        target.Description = Text.OrNull(input.Description);
        target.HeartRateMin = input.HeartRateMin;
        target.HeartRateMax = input.HeartRateMax;
        target.HeartRateAverage = input.HeartRateAverage;
        target.Mood = input.Mood;
        target.Effort = input.Effort;
        target.Wind = input.Wind;
        target.Vehicle = vehicle;
        target.VehicleId = vehicle?.Id;
        Links.ReplaceWith(target.Gadgets, gadgets);
        Links.ReplaceWith(target.Tags, tags);
        target.Recalculate();
    }
}
