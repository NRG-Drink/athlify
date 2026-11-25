using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

/// <summary>
/// The one place where user management looks at users other than the signed-in one: it opts out of the owner
/// filter (ADR-009) for <see cref="User"/> only. Every admin resolver goes through here.
/// </summary>
public static class AdminUsers
{
    public static IQueryable<User> All(AthlifyDbContext db) =>
        db.Users.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]);

    public static async Task<User> RequireAdminAsync(
        ICurrentUser currentUser,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var callerId = currentUser.UserId ?? throw DomainErrors.NotAuthenticated();
        var caller = await db.Users.FirstOrDefaultAsync(u => u.Id == callerId, cancellationToken)
            ?? throw DomainErrors.NotAuthenticated();
        return caller.Role == UserRole.Admin ? caller : throw DomainErrors.Forbidden();
    }
}

/// <summary>Invariants of user management that do not depend on the database.</summary>
public static class UserAdminRules
{
    public static void CheckDelete(int callerId, int targetId)
    {
        if (targetId == callerId)
        {
            throw DomainErrors.CannotDeleteSelf();
        }
    }

    public static void CheckRoleChange(int callerId, User target, UserRole newRole, int adminCount)
    {
        if (newRole == target.Role)
        {
            return;
        }

        if (target.Id == callerId)
        {
            throw DomainErrors.CannotChangeOwnRole();
        }

        if (target.Role == UserRole.Admin && adminCount <= 1)
        {
            throw DomainErrors.LastAdmin();
        }
    }
}
