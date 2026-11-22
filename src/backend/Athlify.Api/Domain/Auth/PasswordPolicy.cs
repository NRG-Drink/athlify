using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Auth;

/// <summary>The rule for every password the API accepts: a new password from the settings or one set by an administrator.</summary>
public static class PasswordPolicy
{
    public const int MinLength = 8;
    public const int MaxLength = 200;

    /// <summary>Values of <c>extensions.rule</c> for a password that is too short or too long.</summary>
    public const string TooShortRule = "PASSWORD_TOO_SHORT";
    public const string TooLongRule = "PASSWORD_TOO_LONG";

    public static void Check(ValidationErrors errors, string? password, string field)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add($"{field} is required.", field);
        }
        else if (password.Length < MinLength)
        {
            errors.Add($"{field} must be at least {MinLength} characters long.", field, TooShortRule);
        }
        else if (password.Length > MaxLength)
        {
            errors.Add($"{field} must not be longer than {MaxLength} characters.", field, TooLongRule);
        }
    }
}
