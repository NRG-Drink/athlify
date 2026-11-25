namespace Athlify.Api.Domain.Users;

// A field that is left out stays unchanged. There is no user id, role or username: the target is the signed-in user.
public record UpdateMeInput(
    string? FirstName,
    string? LastName,
    Language? Language,
    PasswordChangeInput? PasswordChange);
