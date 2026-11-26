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

    /// <summary>The regular (non-administrator) development account, configured under <c>Athlify:DevelopmentUser:RegularUser</c>.</summary>
    public DevelopmentRegularUserOptions RegularUser { get; init; } = new();
}

/// <summary>Settings of the regular development account.</summary>
public record DevelopmentRegularUserOptions
{
    public string FirstName { get; set; } = "Athlify";
    public string LastName { get; set; } = "User";
    public string Username { get; init; } = "user";
    public string Password { get; init; } = "user";
}

/// <summary>Creates the development Administrator and the regular development user once.</summary>
public sealed class DevelopmentUserProvisioner(IHashService hashService)
{
    public async Task<int> EnsureAsync(
        AthlifyDbContext db,
        DevelopmentUserOptions options,
        CancellationToken cancellationToken = default)
    {
        var adminId = await EnsureAccountAsync(
            db,
            options.FirstName,
            options.LastName,
            options.Username,
            options.Password,
            UserRole.Admin,
            cancellationToken);
        await EnsureAccountAsync(
            db,
            options.RegularUser.FirstName,
            options.RegularUser.LastName,
            options.RegularUser.Username,
            options.RegularUser.Password,
            UserRole.User,
            cancellationToken);
        return adminId;
    }

    private async Task<int> EnsureAccountAsync(
        AthlifyDbContext db,
        string firstName,
        string lastName,
        string username,
        string password,
        UserRole role,
        CancellationToken cancellationToken)
    {
        var existing = await db.Users
            .IgnoreQueryFilters([AthlifyDbContext.OwnerFilter])
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
        if (existing is not null)
        {
            return existing.Id;
        }

        var user = new User
        {
            FirstName = firstName,
            LastName = lastName,
            Role = role,
            Language = Language.En,
            Username = username,
            PasswordHash = hashService.HashPassword(password),
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user.Id;
    }
}
