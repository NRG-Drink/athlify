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
        PasswordPolicy.Check(errors, input.Password, "password");
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
        PasswordPolicy.Check(errors, input.NewPassword, "newPassword");
        errors.ThrowIfAny();
    }
}

[MutationType]
public static partial class UserAdminMutation
{
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
            db.ChangeTracker.Clear();
            if (await AdminUsers.All(db).AnyAsync(u => u.Username == username, cancellationToken))
            {
                throw DomainErrors.UsernameTaken();
            }

            throw;
        }

        return user;
    }

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
        var clientIp = cookieService.GetClientIp(httpContextAccessor);

        return await InSerializableTransactionAsync(db, async () =>
        {
            var caller = await AdminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
            UserAdminValidation.ThrowIfInvalid(input);
            var target = await FindAsync(db, id, cancellationToken);

            if (input.Role is { } newRole && newRole != target.Role)
            {
                var adminCount = await AdminUsers.All(db).CountAsync(u => u.Role == UserRole.Admin, cancellationToken);
                UserAdminRules.CheckRoleChange(caller.Id, target, newRole, adminCount);
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
            return target;
        }, cancellationToken);
    }

    private const int MaxSerializationAttempts = 3;

    private static Task<T> InSerializableTransactionAsync<T>(
        AthlifyDbContext db,
        Func<Task<T>> work,
        CancellationToken cancellationToken) =>
        db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            for (var attempt = 1; ; attempt++)
            {
                db.ChangeTracker.Clear();
                try
                {
                    await using var transaction =
                        await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
                    var result = await work();
                    await transaction.CommitAsync(cancellationToken);
                    return result;
                }
                catch (Exception exception) when (attempt < MaxSerializationAttempts && IsSerializationFailure(exception))
                {
                }
            }
        });

    private static bool IsSerializationFailure(Exception exception) =>
        (exception as PostgresException ?? exception.InnerException as PostgresException)?.SqlState
            == PostgresErrorCodes.SerializationFailure;

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

        await tokenService.RevokeAllForUserAsync(
            target.Id, cookieService.GetClientIp(httpContextAccessor), RefreshToken.RevokeReason.PasswordChanged,
            cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return target;
    }

    [ID<User>]
    public static async Task<int> DeleteUser(
        [ID<User>] int id,
        ICurrentUser currentUser,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        return await InSerializableTransactionAsync(db, async () =>
        {
            var caller = await AdminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
            UserAdminRules.CheckDelete(caller.Id, id);
            var target = await FindAsync(db, id, cancellationToken);

            await UserDataDeletion.RemoveAsync(db, target, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
            return id;
        }, cancellationToken);
    }

    private static async Task<User> FindAsync(AthlifyDbContext db, int id, CancellationToken cancellationToken) =>
        await AdminUsers.All(db).FirstOrDefaultAsync(u => u.Id == id, cancellationToken)
            ?? throw DomainErrors.Validation("The user was not found.");
}
