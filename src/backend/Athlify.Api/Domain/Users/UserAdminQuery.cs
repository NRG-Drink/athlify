using Athlify.Api.Database;
using HotChocolate.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

[QueryType]
public static partial class UserAdminQuery
{
    [Authorize(Roles = [nameof(UserRole.Admin)])]
    public static async Task<List<User>> GetUsers(
        ICurrentUser currentUser,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        await AdminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
        return await AdminUsers.All(db)
            .AsNoTracking()
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName).ThenBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }
}
