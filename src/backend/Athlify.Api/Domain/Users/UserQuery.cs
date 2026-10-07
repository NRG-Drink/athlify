using Athlify.Api.Database;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

[QueryType]
public static partial class UserQuery
{
    /// <summary>The signed-in user.</summary>
    public static async Task<User> GetMe(
        ICurrentUser currentUser,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId;
        return await db.Users.SingleAsync(u => u.Id == userId, cancellationToken);
    }
}

/// <summary>Resolves <see cref="User"/> for <c>node(id:)</c>; the owner filter only finds the signed-in user.</summary>
public static class UserNode
{
    public static async Task<User?> GetAsync(
        [ID<User>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        return await db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }
}
