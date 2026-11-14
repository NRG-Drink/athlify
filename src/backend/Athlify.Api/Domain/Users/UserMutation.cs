using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Users;

/// <summary>
/// What a signed-in user may change about themselves. A field that is left out stays unchanged. There is no user id,
/// role or username: the target is always the signed-in user.
/// </summary>
public record UpdateMeInput(
    string? FirstName,
    string? LastName,
    Language? Language,
    PasswordChangeInput? PasswordChange);

public record PasswordChangeInput(string CurrentPassword, string NewPassword);

public static class UpdateMeValidation
{
    public const int MaxNameLength = 100;

    public static void ThrowIfInvalid(UpdateMeInput input)
    {
        var errors = new ValidationErrors();
        if (input.FirstName is not null) errors.Text(input.FirstName, "firstName", MaxNameLength, required: true);
        if (input.LastName is not null) errors.Text(input.LastName, "lastName", MaxNameLength, required: true);
        if (input.PasswordChange is { } change && string.IsNullOrWhiteSpace(change.NewPassword))
        {
            errors.Add("newPassword is required.", "newPassword");
        }

        errors.ThrowIfAny();
    }
}

[MutationType]
public static partial class UserMutation
{
    /// <summary>
    /// Changes the signed-in user's own name, language and password. A password change needs the current password
    /// and revokes all refresh tokens, so every device has to sign in again.
    /// </summary>
    public static async Task<User> UpdateMe(
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
        UpdateMeValidation.ThrowIfInvalid(input);

        // The owner filter only finds the signed-in user.
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
            var ip = httpContextAccessor.HttpContext is { } http ? cookieService.GetIpAddress(http) : "unknown";

            // Marked here, saved below: the new hash and the revocation commit together or not at all.
            await tokenService.RevokeAllForUserAsync(
                userId, ip, RefreshToken.RevokeReason.PasswordChanged, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return user;
    }
}
