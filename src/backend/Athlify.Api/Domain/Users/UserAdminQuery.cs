using Athlify.Api.Database;
using HotChocolate.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

[QueryType]
public sealed partial class UserAdminQuery(AdminUsers adminUsers)
{
    [Authorize(Roles = [nameof(UserRole.Admin)])]
    public async Task<List<User>> GetUsers(
        ICurrentUser currentUser,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        await adminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
        return await adminUsers.All(db)
            .AsNoTracking()
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName).ThenBy(u => u.Username)
            .ToListAsync(cancellationToken);
    }
}
