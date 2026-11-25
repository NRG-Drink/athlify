using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

[MutationType]
public sealed partial class UserMutation(UpdateMeValidation updateMeValidation)
{
    public async Task<User> UpdateMe(
        UpdateMeInput input,
        ICurrentUser currentUser,
        AthlifyDbContext db,
        IHashService hashService,
        ITokenService tokenService,
        ICookieService cookieService,
        IHttpContextAccessor httpContextAccessor,
        CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId ?? throw DomainErrors.NotAuthenticated();
        updateMeValidation.ThrowIfInvalid(input);

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
            await tokenService.RevokeAllForUserAsync(
                userId, cookieService.GetClientIp(httpContextAccessor), RefreshToken.RevokeReason.PasswordChanged,
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return user;
    }
}
