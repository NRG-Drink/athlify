using System.Data;
using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Athlify.Api.Domain.Users;

/// <summary>A new account. The administrator chooses the initial password and hands it over.</summary>
public record CreateUserInput(
    string Username,
    string FirstName,
    string LastName,
    Language? Language,
    UserRole? Role,
    string Password);

/// <summary>A field that is left out stays unchanged. The username is the login key and cannot be changed.</summary>
public record UpdateUserInput(
    string? FirstName,
    string? LastName,
    Language? Language,
    UserRole? Role);

public record ResetUserPasswordInput(string NewPassword);

public static class UserAdminValidation
{
    public const int MaxUsernameLength = 100;
    public const int MinPasswordLength = 8;
    public const int MaxPasswordLength = 200;

    public static void ThrowIfInvalid(CreateUserInput input)
    {
        var errors = new ValidationErrors();
        errors.Text(input.Username, "username", MaxUsernameLength, required: true);
        if (input.Username.Trim().Any(char.IsWhiteSpace))
        {
            errors.Add("username must not contain spaces.", "username");
        }

        errors.Text(input.FirstName, "firstName", UpdateMeValidation.MaxNameLength, required: true);
        errors.Text(input.LastName, "lastName", UpdateMeValidation.MaxNameLength, required: true);
        Password(errors, input.Password, "password");
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

    public static void ThrowIfInvalid(ResetUserPasswordInput input)
    {
        var errors = new ValidationErrors();
        Password(errors, input.NewPassword, "newPassword");
        errors.ThrowIfAny();
    }

    private static void Password(ValidationErrors errors, string? password, string field)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            errors.Add($"{field} is required.", field);
        }
        else if (password.Length < MinPasswordLength)
        {
            errors.Add($"{field} must be at least {MinPasswordLength} characters long.", field);
        }
        else if (password.Length > MaxPasswordLength)
        {
            errors.Add($"{field} must not be longer than {MaxPasswordLength} characters.", field);
        }
    }
}

[MutationType]
public static partial class UserAdminMutation
{
    /// <summary>Creates an account. Administrators only.</summary>
    public static async Task<User> CreateUser(
        CreateUserInput input,
        ICurrentUser currentUser,
        AthlifyDbContext db,
        IHashService hashService,
        CancellationToken cancellationToken)
    {
        await AdminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
        UserAdminValidation.ThrowIfInvalid(input);

        var username = input.Username.Trim();
        if (await AdminUsers.All(db).AnyAsync(u => u.Username == username, cancellationToken))
        {
            throw DomainErrors.UsernameTaken();
        }

        var user = new User
        {
            Username = username,
            FirstName = input.FirstName.Trim(),
            LastName = input.LastName.Trim(),
            Language = input.Language ?? Language.De,
            Role = input.Role ?? UserRole.User,
            PasswordHash = hashService.HashPassword(input.Password),
        };
        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Lost a race against another create with the same username: the unique index caught it.
            db.ChangeTracker.Clear();
            if (await AdminUsers.All(db).AnyAsync(u => u.Username == username, cancellationToken))
            {
                throw DomainErrors.UsernameTaken();
            }

            throw;
        }

        return user;
    }

    /// <summary>
    /// Changes another user's (or the administrator's own) name, language and role. A role change signs the
    /// user out everywhere, so the new role applies to their next access token.
    /// </summary>
    public static async Task<User> UpdateUser(
        [ID<User>] int id,
        UpdateUserInput input,
        ICurrentUser currentUser,
        AthlifyDbContext db,
        ITokenService tokenService,
        ICookieService cookieService,
        IHttpContextAccessor httpContextAccessor,
        CancellationToken cancellationToken)
    {
        var caller = await AdminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
        UserAdminValidation.ThrowIfInvalid(input);
        var clientIp = cookieService.GetClientIp(httpContextAccessor);

        // Serializable: two concurrent demotions that each count enough administrators must not both commit.
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await ApplyUpdateAsync(caller.Id, id, input, db, tokenService, clientIp, cancellationToken);
            }
            catch (Exception exception) when (attempt < MaxSerializationAttempts && IsSerializationFailure(exception))
            {
                db.ChangeTracker.Clear();
            }
        }
    }

    private const int MaxSerializationAttempts = 3;

    private static async Task<User> ApplyUpdateAsync(
        int callerId,
        int id,
        UpdateUserInput input,
        AthlifyDbContext db,
        ITokenService tokenService,
        string clientIp,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var target = await FindAsync(db, id, cancellationToken);

        if (input.Role is { } newRole && newRole != target.Role)
        {
            var adminCount = await AdminUsers.All(db).CountAsync(u => u.Role == UserRole.Admin, cancellationToken);
            UserAdminRules.CheckRoleChange(callerId, target, newRole, adminCount);
            target.Role = newRole;
            await tokenService.RevokeAllForUserAsync(
                target.Id, clientIp, RefreshToken.RevokeReason.RoleChanged, cancellationToken);
        }

        target.FirstName = input.FirstName?.Trim() ?? target.FirstName;
        target.LastName = input.LastName?.Trim() ?? target.LastName;
        if (input.Language is { } language)
        {
            target.Language = language;
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return target;
    }

    /// <summary>Postgres aborts one of two conflicting serializable transactions with SQLSTATE 40001.</summary>
    private static bool IsSerializationFailure(Exception exception) =>
        (exception as PostgresException ?? exception.InnerException as PostgresException)?.SqlState
            == PostgresErrorCodes.SerializationFailure;

    /// <summary>
    /// Sets a new password for a user and signs them out everywhere. Administrators only; the administrator
    /// knows the new password, so the user should change it in the settings afterwards.
    /// </summary>
    public static async Task<User> ResetUserPassword(
        [ID<User>] int id,
        ResetUserPasswordInput input,
        ICurrentUser currentUser,
        AthlifyDbContext db,
        IHashService hashService,
        ITokenService tokenService,
        ICookieService cookieService,
        IHttpContextAccessor httpContextAccessor,
        CancellationToken cancellationToken)
    {
        await AdminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
        UserAdminValidation.ThrowIfInvalid(input);

        var target = await FindAsync(db, id, cancellationToken);
        target.PasswordHash = hashService.HashPassword(input.NewPassword);

        // Marked here, saved below: the new hash and the revocation commit together or not at all.
        await tokenService.RevokeAllForUserAsync(
            target.Id, cookieService.GetClientIp(httpContextAccessor), RefreshToken.RevokeReason.PasswordChanged,
            cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return target;
    }

    private static async Task<User> FindAsync(AthlifyDbContext db, int id, CancellationToken cancellationToken) =>
        await AdminUsers.All(db).FirstOrDefaultAsync(u => u.Id == id, cancellationToken)
            ?? throw DomainErrors.Validation("The user was not found.");
}
