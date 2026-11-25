namespace Athlify.Api.Domain.Users;

public record PasswordChangeInput(string CurrentPassword, string NewPassword);
