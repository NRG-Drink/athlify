using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

// The only place where user management looks at other users. It opts out of the owner filter (ADR-009) for User only.
public static class AdminUsers
{
    public static IQueryable<User> All(AthlifyDbContext db) =>
        db.Users.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]);

    // Reads the role from the database, not the token: a demoted administrator loses access at once (ADR-013).
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
