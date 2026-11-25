using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Users;

public static class UserAdminValidation
{
    public const int MaxUsernameLength = 100;

    public static void ThrowIfInvalid(CreateUserInput input, PasswordPolicy passwordPolicy)
    {
        var errors = new ValidationErrors();
        errors.Text(input.Username, "username", MaxUsernameLength, required: true);
        if (input.Username.Trim().Any(char.IsWhiteSpace))
        {
            errors.Add("username must not contain spaces.", "username");
        }

        errors.Text(input.FirstName, "firstName", UpdateMeValidation.MaxNameLength, required: true);
        errors.Text(input.LastName, "lastName", UpdateMeValidation.MaxNameLength, required: true);
        passwordPolicy.Check(errors, input.Password, "password");
        errors.ThrowIfAny();
    }

    public static void ThrowIfInvalid(UpdateUserInput input)
    {
        var errors = new ValidationErrors();
        if (input.FirstName is not null)
        {
            errors.Text(input.FirstName, "firstName", UpdateMeValidation.MaxNameLength, required: true);
        }

        if (input.LastName is not null)
        {
            errors.Text(input.LastName, "lastName", UpdateMeValidation.MaxNameLength, required: true);
        }

        errors.ThrowIfAny();
    }

    public static void ThrowIfInvalid(ResetUserPasswordInput input, PasswordPolicy passwordPolicy)
    {
        var errors = new ValidationErrors();
        passwordPolicy.Check(errors, input.NewPassword, "newPassword");
        errors.ThrowIfAny();
    }
}
