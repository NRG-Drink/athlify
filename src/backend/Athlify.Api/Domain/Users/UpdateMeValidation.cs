using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Users;

public static class UpdateMeValidation
{
    public const int MaxNameLength = 100;

    public static void ThrowIfInvalid(UpdateMeInput input, PasswordPolicy passwordPolicy)
    {
        var errors = new ValidationErrors();
        if (input.FirstName is not null) errors.Text(input.FirstName, "firstName", MaxNameLength, required: true);
        if (input.LastName is not null) errors.Text(input.LastName, "lastName", MaxNameLength, required: true);
        if (input.PasswordChange is { } change)
        {
            passwordPolicy.Check(errors, change.NewPassword, "newPassword");
        }

        errors.ThrowIfAny();
    }
}
