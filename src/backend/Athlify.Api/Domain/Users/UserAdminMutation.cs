using System.Data;
using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;
using HotChocolate.Authorization;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Athlify.Api.Domain.Users;

[MutationType]
public static partial class UserAdminMutation
{
    [Authorize(Roles = [nameof(UserRole.Admin)])]
    public static async Task<User> CreateUser(
        CreateUserInput input,
        ICurrentUser currentUser,
        AthlifyDbContext db,
        IHashService hashService,
        PasswordPolicy passwordPolicy,
        CancellationToken cancellationToken)
    {
        await AdminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
        UserAdminValidation.ThrowIfInvalid(input, passwordPolicy);

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

        // A concurrent create of the same username passes the check above and fails on the unique index.
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

    [Authorize(Roles = [nameof(UserRole.Admin)])]
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

    [Authorize(Roles = [nameof(UserRole.Admin)])]
    public static async Task<User> ResetUserPassword(
        [ID<User>] int id,
        ResetUserPasswordInput input,
        ICurrentUser currentUser,
        AthlifyDbContext db,
        IHashService hashService,
        ITokenService tokenService,
        ICookieService cookieService,
        IHttpContextAccessor httpContextAccessor,
        PasswordPolicy passwordPolicy,
        CancellationToken cancellationToken)
    {
        await AdminUsers.RequireAdminAsync(currentUser, db, cancellationToken);
        UserAdminValidation.ThrowIfInvalid(input, passwordPolicy);

        var target = await FindAsync(db, id, cancellationToken);
        target.PasswordHash = hashService.HashPassword(input.NewPassword);

        await tokenService.RevokeAllForUserAsync(
            target.Id, cookieService.GetClientIp(httpContextAccessor), RefreshToken.RevokeReason.PasswordChanged,
            cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
        return target;
    }

    [ID<User>]
    [Authorize(Roles = [nameof(UserRole.Admin)])]
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

    private const int MaxSerializationAttempts = 3;

    // PostgreSQL serializable: the admin check and the last-administrator count run inside the transaction, and a
    // serialization failure is retried against the committed state. The retrying execution strategy of Aspnet
    // (EnrichNpgsqlDbContext) requires the whole transaction to run inside it.
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

    private static async Task<User> FindAsync(AthlifyDbContext db, int id, CancellationToken cancellationToken) =>
        await AdminUsers.All(db).FirstOrDefaultAsync(u => u.Id == id, cancellationToken)
            ?? throw DomainErrors.Validation("The user was not found.");
}
