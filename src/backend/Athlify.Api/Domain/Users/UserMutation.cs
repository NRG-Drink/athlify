using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

[MutationType]
public static partial class UserMutation
{
    public static async Task<User> UpdateMe(
        UpdateMeInput input,
        ICurrentUser currentUser,
        AthlifyDbContext db,
        IHashService hashService,
        ITokenService tokenService,
        ICookieService cookieService,
        IHttpContextAccessor httpContextAccessor,
        PasswordPolicy passwordPolicy,
        CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId ?? throw DomainErrors.NotAuthenticated();
        UpdateMeValidation.ThrowIfInvalid(input, passwordPolicy);

        var user = await db.Users.SingleAsync(u => u.Id == userId, cancellationToken);

        var change = input.PasswordChange;
        if (change is not null && !hashService.VerifyPassword(change.CurrentPassword, user.PasswordHash))
        {
            throw DomainErrors.CurrentPasswordIncorrect();
        }

        user.FirstName = input.FirstName?.Trim() ?? user.FirstName;
        user.LastName = input.LastName?.Trim() ?? user.LastName;
        if (input.Language is { } language)
        {
            user.Language = language;
        }

        if (change is not null)
        {
            user.PasswordHash = hashService.HashPassword(change.NewPassword);
            // Marked here, saved below: the new hash and the revocation commit together or not at all.
            await tokenService.RevokeAllForUserAsync(
                userId, cookieService.GetClientIp(httpContextAccessor), RefreshToken.RevokeReason.PasswordChanged,
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return user;
    }
}
