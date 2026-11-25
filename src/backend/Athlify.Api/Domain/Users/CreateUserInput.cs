namespace Athlify.Api.Domain.Users;

public record CreateUserInput(
    string Username,
    string FirstName,
    string LastName,
    Language? Language,
    UserRole? Role,
    string Password);
