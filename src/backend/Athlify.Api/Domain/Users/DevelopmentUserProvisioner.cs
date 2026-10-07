using Athlify.Api.Database;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

/// <summary>Configuration section <c>Athlify:DevelopmentUser</c>.</summary>
public class DevelopmentUserOptions
{
    public const string Section = "Athlify:DevelopmentUser";

    public string Email { get; set; } = "admin@athlify.local";
    public string FirstName { get; set; } = "Athlify";
    public string LastName { get; set; } = "Admin";
}

/// <summary>Creates the development Administrator once and returns its id.</summary>
public static class DevelopmentUserProvisioner
{
    public static async Task<int> EnsureAsync(
        AthlifyDbContext db,
        DevelopmentUserOptions options,
        CancellationToken cancellationToken = default)
    {
        // No user is signed in during startup, so the owner filter must not run.
        var existing = await db.Users
            .IgnoreQueryFilters([AthlifyDbContext.OwnerFilter])
            .FirstOrDefaultAsync(u => u.Email == options.Email, cancellationToken);
        if (existing is not null)
        {
            return existing.Id;
        }

        var user = new User
        {
            Email = options.Email,
            FirstName = options.FirstName,
            LastName = options.LastName,
            Role = Role.Administrator,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user.Id;
    }
}
