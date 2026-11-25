using Athlify.Api.Database;
using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Body;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Events;
using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Strava;
using Athlify.Api.Domain.Tags;
using Athlify.Api.Domain.Vehicles;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

/// <summary>
/// Removes a user together with everything they own. PostgreSQL would cascade through the foreign keys, but the
/// endpoint tests run on InMemory, which has no foreign-key actions, so the owned records are removed explicitly
/// in the same <c>SaveChanges</c> (see the backend learnings). Every entity that implements <see cref="IOwned"/>
/// must be listed in <see cref="OwnedEntityTypes"/>; a test fails when the model has one that is missing.
/// </summary>
public sealed class UserDataDeletion
{
    public static readonly Type[] OwnedEntityTypes =
    [
        typeof(Activity),
        typeof(ActivityMerge),
        typeof(RefreshToken),
        typeof(BodyStats),
        typeof(Event),
        typeof(StravaConnection),
        typeof(Tag),
        typeof(Vehicle),
        typeof(Gadget),
        typeof(MaintenanceCycle),
    ];

    public async Task RemoveAsync(AthlifyDbContext db, User user, CancellationToken cancellationToken)
    {
        await RemoveOwnedAsync<Activity>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<ActivityMerge>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<RefreshToken>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<BodyStats>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<Event>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<StravaConnection>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<Tag>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<Vehicle>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<Gadget>(db, user.Id, cancellationToken);
        await RemoveOwnedAsync<MaintenanceCycle>(db, user.Id, cancellationToken);

        db.SeedMarkers.RemoveRange(await db.SeedMarkers
            .IgnoreQueryFilters()
            .Where(m => m.UserId == user.Id)
            .ToListAsync(cancellationToken));

        db.Users.Remove(user);
    }

    private static async Task RemoveOwnedAsync<T>(AthlifyDbContext db, int userId, CancellationToken cancellationToken)
        where T : class, IOwned
    {
        var rows = await db.Set<T>().IgnoreQueryFilters().Where(e => e.UserId == userId).ToListAsync(cancellationToken);
        db.RemoveRange(rows);
    }
}
