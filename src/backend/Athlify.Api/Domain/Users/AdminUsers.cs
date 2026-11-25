using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

// The only place where user management looks at other users. It opts out of the owner filter (ADR-009) for User only.
// It reads the role from the database, not the token, so a demoted administrator loses access at once.
public sealed class AdminUsers
{
    public IQueryable<User> All(AthlifyDbContext db) =>
        db.Users.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]);

    public async Task<User> RequireAdminAsync(
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
