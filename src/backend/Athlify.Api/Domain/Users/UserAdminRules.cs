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

    /// <summary>
    /// Returns the signed-in user when they are an Administrator. The role is read from the database, not from
    /// the access token, so a demoted administrator is locked out at once instead of when the token expires.
    /// </summary>
    /// <exception cref="GraphQLException">
    /// <c>NOT_AUTHENTICATED</c> when nobody is signed in, <c>FORBIDDEN</c> when the user is no administrator.
    /// </exception>
    public static async Task<User> RequireAdminAsync(
        ICurrentUser currentUser,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        // The owner filter already narrows db.Users to the signed-in user, so no opt-out is needed here.
        var callerId = currentUser.UserId ?? throw DomainErrors.NotAuthenticated();
        var caller = await db.Users.FirstOrDefaultAsync(u => u.Id == callerId, cancellationToken)
            ?? throw DomainErrors.NotAuthenticated();
        return caller.Role == UserRole.Admin ? caller : throw DomainErrors.Forbidden();
    }
}

/// <summary>Invariants of user management that do not depend on the database.</summary>
public static class UserAdminRules
{
    /// <summary>
    /// Checks a deletion. Nobody deletes their own account, so the signed-in administrator always remains
    /// and the last administrator cannot be deleted either.
    /// </summary>
    public static void CheckDelete(int callerId, int targetId)
    {
        if (targetId == callerId)
        {
            throw DomainErrors.CannotDeleteSelf();
        }
    }

    /// <summary>
    /// Checks a role change. An administrator cannot change their own role, and the last administrator cannot be
    /// demoted. The caller reads the count and writes the change in one serializable transaction, so two
    /// administrators demoting each other at the same moment cannot both pass.
    /// </summary>
    /// <param name="adminCount">How many administrators exist before the change.</param>
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
