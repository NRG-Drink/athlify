using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Users;

public enum Role
{
    User,
    Administrator,
}

public enum Language
{
    De,
    En,
}

/// <summary>An account. An Administrator keeps every regular-user permission and can also manage users.</summary>
public class User : Entity
{
    public string Email { get; set; } = string.Empty;

    /// <summary>Set by the authentication feature; never exposed through the API.</summary>
    public string? PasswordHash { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Language Language { get; set; } = Language.De;
    public Role Role { get; set; } = Role.User;
}
