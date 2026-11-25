using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;

namespace Athlify.Api.Domain.Users;

public sealed class UpdateMeValidation(PasswordPolicy passwordPolicy)
{
    public const int MaxNameLength = 100;

    public void ThrowIfInvalid(UpdateMeInput input)
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
