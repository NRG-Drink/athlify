using Athlify.Api.Database;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

[QueryType]
public sealed partial class UserQuery
{
    public async Task<User> GetMe(
        ICurrentUser currentUser,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId;
        return await db.Users.SingleAsync(u => u.Id == userId, cancellationToken);
    }
}
