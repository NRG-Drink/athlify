using Athlify.Api.Database;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

/// <summary>Resolves <see cref="User"/> for <c>node(id:)</c>; the owner filter only finds the signed-in user.</summary>
public sealed class UserNode
{
    public async Task<User?> GetAsync(
        [ID<User>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        return await db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }
}
