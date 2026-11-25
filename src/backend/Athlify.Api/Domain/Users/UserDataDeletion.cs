using System.Reflection;
using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

/// <summary>
/// Removes a user together with everything they own. PostgreSQL would cascade through the foreign keys, but the
/// endpoint tests run on InMemory, which has no foreign-key actions, so the owned records are removed explicitly
/// in the same <c>SaveChanges</c> (see the backend learnings). Every entity that implements <see cref="IOwned"/>
/// is found through the model, so a new owned entity is covered without touching this class.
/// </summary>
public static class UserDataDeletion
{
    private static readonly MethodInfo RemoveOwnedMethod =
        typeof(UserDataDeletion).GetMethod(nameof(RemoveOwnedAsync), BindingFlags.NonPublic | BindingFlags.Static)!;

    public static async Task RemoveAsync(AthlifyDbContext db, User user, CancellationToken cancellationToken)
    {
        var ownedTypes = db.Model.GetEntityTypes()
            .Select(t => t.ClrType)
            .Where(type => !type.IsAbstract && typeof(IOwned).IsAssignableFrom(type));
        foreach (var type in ownedTypes)
        {
            await (Task)RemoveOwnedMethod.MakeGenericMethod(type).Invoke(null, [db, user.Id, cancellationToken])!;
        }

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
