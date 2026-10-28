using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Users;

public enum Language
{
    De,
    En,
}

public static class UserRole
{
    public const string User = nameof(User);
    public const string Admin = nameof(Admin);
}

/// <summary>An account. An Administrator keeps every regular-user permission and can also manage users.</summary>
public class User : Entity
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /// <summary>Set by the authentication feature; never exposed through the API.</summary>
    public string? PasswordHash { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Language Language { get; set; } = Language.De;
    public string Role { get; set; } = UserRole.User;

    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
