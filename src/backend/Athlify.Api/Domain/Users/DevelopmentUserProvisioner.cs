using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

/// <summary>Configuration section <c>Athlify:DevelopmentUser</c>.</summary>
public record DevelopmentUserOptions
{
    public const string Section = "Athlify:DevelopmentUser";

    public string FirstName { get; set; } = "Athlify";
    public string LastName { get; set; } = "Admin";
    public string Username { get; init; } = "admin";
    public string Password { get; init; } = "admin";
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
            .FirstOrDefaultAsync(u => u.Username == options.Username, cancellationToken);
        if (existing is not null)
        {
            return existing.Id;
        }

        var hashService = new HashService();
        var passwordHash = hashService.HashPassword(options.Password);
        var user = new User
        {
            FirstName = options.FirstName,
            LastName = options.LastName,
            Role = UserRole.Admin,
            Username = options.Username,
            PasswordHash = passwordHash,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user.Id;
    }
}
