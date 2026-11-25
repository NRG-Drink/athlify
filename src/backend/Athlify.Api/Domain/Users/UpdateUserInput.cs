namespace Athlify.Api.Domain.Users;

// A field that is left out stays unchanged. The username is the login key and cannot be changed.
public record UpdateUserInput(
    string? FirstName,
    string? LastName,
    Language? Language,
    UserRole? Role);
