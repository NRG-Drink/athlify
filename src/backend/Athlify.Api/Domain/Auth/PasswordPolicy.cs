using Athlify.Api.Domain.Common;
using Microsoft.Extensions.Options;

namespace Athlify.Api.Domain.Auth;

public class PasswordPolicyOptions
{
    public const string SectionName = "PasswordPolicy";

    public int MinLength { get; set; } = 8;
    public int MaxLength { get; set; } = 200;
}

// The rule for every password the API accepts: a new password from the settings or one set by an administrator.
public sealed class PasswordPolicy
{
    public const string TooShortRule = "PASSWORD_TOO_SHORT";
    public const string TooLongRule = "PASSWORD_TOO_LONG";

    private readonly int _minLength;
    private readonly int _maxLength;

    public PasswordPolicy(IOptions<PasswordPolicyOptions> options)
    {
        _minLength = options.Value.MinLength;
        _maxLength = options.Value.MaxLength;
        if (_minLength < 1 || _maxLength < _minLength)
        {
            throw new InvalidOperationException("PasswordPolicy: MinLength must be at least 1 and not exceed MaxLength.");
        }
    }

    public void Check(ValidationErrors errors, string? password, string field)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add($"{field} is required.", field);
        }
        else if (password.Length < _minLength)
        {
            errors.Add($"{field} must be at least {_minLength} characters long.", field, TooShortRule, ("minLength", _minLength));
        }
        else if (password.Length > _maxLength)
        {
            errors.Add($"{field} must not be longer than {_maxLength} characters.", field, TooLongRule, ("maxLength", _maxLength));
        }
    }
}
