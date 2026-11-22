using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Users;
using HotChocolate;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class UserAdminTests : WebApiTestBase
{
    private const string Admin = "admin@example.com";
    private const string Luca = "luca@example.com";

    private const string UsersQuery = "query { users { id username firstName lastName language role } }";

    private const string CreateUser = """
        mutation($input: CreateUserInput!) {
          createUser(input: $input) { id username firstName lastName language role }
        }
        """;

    private const string UpdateUser = """
        mutation($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) { id username firstName lastName language role }
        }
        """;

    private const string ResetPassword = """
        mutation($id: ID!, $input: ResetUserPasswordInput!) {
          resetUserPassword(id: $id, input: $input) { id username }
        }
        """;

    private static readonly HashService Hasher = new();

    private static object NewUser(string username = "mia", string password = "secret-pass") => new
    {
        username,
        firstName = "Mia",
        lastName = "Meier",
        language = "EN",
        role = "USER",
        password,
    };

    // ---- list ----

    [Test]
    public async Task UsersReturnsAllUsersForAdmin()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        await CreateUserClientAsync("mia@example.com");

        var users = (await DataAsync(admin, UsersQuery)).GetProperty("users").EnumerateArray().ToList();

        // The application also provisions its development administrator at startup.
        await Assert.That(users.Count).IsGreaterThanOrEqualTo(3);
        await Assert.That(users.Select(u => u.GetProperty("username").GetString()))
            .Contains(Luca).And.Contains("mia@example.com").And.Contains(Admin);
    }

    [Test]
    public async Task UsersDeniedForRegularUser()
    {
        var client = await CreateUserClientAsync(Luca);

        var root = await PostAsync(client, UsersQuery);

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ForbiddenCode);
    }

    [Test]
    public async Task UsersDeniedWhenNobodyIsSignedIn()
    {
        var root = await PostAsync(Factory.CreateClient(), UsersQuery);

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.NotAuthenticatedCode);
    }

    [Test]
    public async Task UsersDoesNotExposePasswordHashOrPersonalRecords()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);

        var hash = await PostAsync(admin, "query { users { passwordHash } }");
        var activities = await PostAsync(admin, "query { users { activities { id } } }");

        await Assert.That(hash.TryGetProperty("errors", out _)).IsTrue();
        await Assert.That(activities.TryGetProperty("errors", out _)).IsTrue();
    }

    // ---- create ----

    [Test]
    public async Task CreateUserStoresTheAccountAndTheUserCanBeFoundByPassword()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);

        var created = (await DataAsync(admin, CreateUser, new
        {
            input = new
            {
                username = "  mia ",
                firstName = " Mia ",
                lastName = "Meier",
                language = "EN",
                role = "ADMIN",
                password = "secret-pass",
            },
        })).GetProperty("createUser");

        await Assert.That(created.GetProperty("username").GetString()).IsEqualTo("mia");
        await Assert.That(created.GetProperty("firstName").GetString()).IsEqualTo("Mia");
        await Assert.That(created.GetProperty("language").GetString()).IsEqualTo("EN");
        await Assert.That(created.GetProperty("role").GetString()).IsEqualTo("ADMIN");
        var stored = await GetUserAsync("mia");
        await Assert.That(stored.PasswordHash).IsNotEqualTo("secret-pass");
        await Assert.That(Hasher.VerifyPassword("secret-pass", stored.PasswordHash)).IsTrue();
    }

    [Test]
    public async Task CreateUserDefaultsToGermanRegularUser()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);

        var created = (await DataAsync(admin, CreateUser, new
        {
            input = new { username = "mia", firstName = "Mia", lastName = "Meier", password = "secret-pass" },
        })).GetProperty("createUser");

        await Assert.That(created.GetProperty("language").GetString()).IsEqualTo("DE");
        await Assert.That(created.GetProperty("role").GetString()).IsEqualTo("USER");
    }

    [Test]
    public async Task CreateUserRejectsDuplicateUsername()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);

        var root = await PostAsync(admin, CreateUser, new { input = NewUser(Luca) });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.UsernameTakenCode);
        await Assert.That(await CountUsersAsync(Luca)).IsEqualTo(1);
    }

    [Test]
    [Arguments("username", "  ")]
    [Arguments("username", "two words")]
    [Arguments("firstName", "")]
    [Arguments("lastName", "  ")]
    [Arguments("password", "short")]
    [Arguments("password", "        ")]
    public async Task CreateUserRejectsInvalidInput(string field, string value)
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        var input = new Dictionary<string, object>
        {
            ["username"] = "mia",
            ["firstName"] = "Mia",
            ["lastName"] = "Meier",
            ["password"] = "secret-pass",
            [field] = value,
        };

        var root = await PostAsync(admin, CreateUser, new { input });

        await AssertValidationErrorAsync(root, field);
        await Assert.That(await CountUsersAsync("mia")).IsEqualTo(0);
    }

    // ---- update ----

    [Test]
    public async Task UpdateUserChangesNameLanguageAndRole()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        var id = await GlobalIdAsync(admin, Luca);

        var updated = (await DataAsync(admin, UpdateUser, new
        {
            id,
            input = new { firstName = " Luca ", lastName = "Rossi", language = "EN", role = "ADMIN" },
        })).GetProperty("updateUser");

        await Assert.That(updated.GetProperty("firstName").GetString()).IsEqualTo("Luca");
        await Assert.That(updated.GetProperty("lastName").GetString()).IsEqualTo("Rossi");
        await Assert.That(updated.GetProperty("language").GetString()).IsEqualTo("EN");
        await Assert.That(updated.GetProperty("role").GetString()).IsEqualTo("ADMIN");
        await Assert.That(updated.GetProperty("username").GetString()).IsEqualTo(Luca);
    }

    [Test]
    public async Task UpdateUserKeepsOmittedFieldsAndTouchesOnlyTheTarget()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        await CreateUserClientAsync("mia@example.com");
        var id = await GlobalIdAsync(admin, Luca);

        await DataAsync(admin, UpdateUser, new { id, input = new { language = "EN" } });

        var luca = await GetUserAsync(Luca);
        await Assert.That(luca.Language).IsEqualTo(Language.En);
        await Assert.That(luca.FirstName).IsEqualTo("Test");
        await Assert.That(luca.Role).IsEqualTo(UserRole.User);
        await Assert.That((await GetUserAsync("mia@example.com")).Language).IsEqualTo(Language.De);
        await Assert.That((await GetUserAsync(Admin)).Language).IsEqualTo(Language.De);
    }

    [Test]
    [Arguments("firstName", "")]
    [Arguments("lastName", "  ")]
    public async Task UpdateUserRejectsBlankNames(string field, string value)
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        var id = await GlobalIdAsync(admin, Luca);

        var root = await PostAsync(admin, UpdateUser, new
        {
            id,
            input = new Dictionary<string, object> { [field] = value },
        });

        await AssertValidationErrorAsync(root, field);
    }

    [Test]
    public async Task UpdateUserInputHasNoUsernameOrPassword()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        var id = await GlobalIdAsync(admin, Luca);

        var username = await PostAsync(admin, UpdateUser, new { id, input = new { username = "other" } });
        var password = await PostAsync(admin, UpdateUser, new { id, input = new { password = "other-pass" } });

        await Assert.That(username.TryGetProperty("errors", out _)).IsTrue();
        await Assert.That(password.TryGetProperty("errors", out _)).IsTrue();
    }

    [Test]
    public async Task AdminCanChangeOwnNameButNotOwnRole()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        var id = await GlobalIdAsync(admin, Admin);

        await DataAsync(admin, UpdateUser, new { id, input = new { firstName = "Boss" } });
        var root = await PostAsync(admin, UpdateUser, new { id, input = new { role = "USER" } });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.CannotChangeOwnRoleCode);
        var stored = await GetUserAsync(Admin);
        await Assert.That(stored.FirstName).IsEqualTo("Boss");
        await Assert.That(stored.Role).IsEqualTo(UserRole.Admin);
    }

    [Test]
    public async Task RoleChangeRevokesTheTargetsRefreshTokensOnly()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        await CreateUserClientAsync("mia@example.com");
        var lucaId = (await GetUserAsync(Luca)).Id;
        var miaId = (await GetUserAsync("mia@example.com")).Id;
        await AddRefreshTokensAsync(lucaId, 2);
        await AddRefreshTokensAsync(miaId, 1);

        await DataAsync(admin, UpdateUser, new { id = await GlobalIdAsync(admin, Luca), input = new { role = "ADMIN" } });

        var lucaTokens = await GetRefreshTokensAsync(lucaId);
        await Assert.That(lucaTokens.All(t => t.Revoked is not null)).IsTrue();
        await Assert.That(lucaTokens.All(t => t.ReasonRevoked == RefreshToken.RevokeReason.RoleChanged)).IsTrue();
        await Assert.That((await GetRefreshTokensAsync(miaId)).All(t => t.Revoked is null)).IsTrue();
    }

    [Test]
    public async Task NameChangeKeepsTheTargetsRefreshTokens()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        var lucaId = (await GetUserAsync(Luca)).Id;
        await AddRefreshTokensAsync(lucaId, 1);

        await DataAsync(admin, UpdateUser, new { id = await GlobalIdAsync(admin, Luca), input = new { firstName = "Luca" } });

        await Assert.That((await GetRefreshTokensAsync(lucaId)).All(t => t.Revoked is null)).IsTrue();
    }

    [Test]
    public async Task UpdateUserOfUnknownIdFailsLikeNotFound()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        var id = await GlobalIdAsync(admin, Luca);
        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
            db.Users.Remove(await db.Users.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]).SingleAsync(u => u.Username == Luca));
            await db.SaveChangesAsync();
        }

        var root = await PostAsync(admin, UpdateUser, new { id, input = new { firstName = "X" } });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
    }

    // ---- reset password ----

    [Test]
    public async Task ResetPasswordReplacesTheHashAndRevokesTokens()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        var lucaId = await SetPasswordAsync(Luca, "old-secret");
        await AddRefreshTokensAsync(lucaId, 2);

        await DataAsync(admin, ResetPassword, new
        {
            id = await GlobalIdAsync(admin, Luca),
            input = new { newPassword = "brand-new-pass" },
        });

        var stored = await GetUserAsync(Luca);
        await Assert.That(Hasher.VerifyPassword("brand-new-pass", stored.PasswordHash)).IsTrue();
        await Assert.That(Hasher.VerifyPassword("old-secret", stored.PasswordHash)).IsFalse();
        var tokens = await GetRefreshTokensAsync(lucaId);
        await Assert.That(tokens.All(t => t.Revoked is not null)).IsTrue();
        await Assert.That(tokens.All(t => t.ReasonRevoked == RefreshToken.RevokeReason.PasswordChanged)).IsTrue();
    }

    [Test]
    [Arguments("")]
    [Arguments("short")]
    public async Task ResetPasswordRejectsWeakPasswords(string password)
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        await CreateUserClientAsync(Luca);
        await SetPasswordAsync(Luca, "old-secret");

        var root = await PostAsync(admin, ResetPassword, new
        {
            id = await GlobalIdAsync(admin, Luca),
            input = new { newPassword = password },
        });

        await AssertValidationErrorAsync(root, "newPassword");
        var stored = await GetUserAsync(Luca);
        await Assert.That(Hasher.VerifyPassword("old-secret", stored.PasswordHash)).IsTrue();
    }

    // ---- authorization ----

    [Test]
    public async Task RegularUserCannotCreateUpdateOrResetUsers()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        var luca = await CreateUserClientAsync(Luca);
        var adminId = await GlobalIdAsync(admin, Admin);
        var before = await GetUserAsync(Admin);

        var create = await PostAsync(luca, CreateUser, new { input = NewUser() });
        var update = await PostAsync(luca, UpdateUser, new { id = adminId, input = new { firstName = "Hacked", role = "USER" } });
        var reset = await PostAsync(luca, ResetPassword, new { id = adminId, input = new { newPassword = "hacked-pass" } });

        await Assert.That(ErrorCodes(create)).Contains(DomainErrors.ForbiddenCode);
        await Assert.That(ErrorCodes(update)).Contains(DomainErrors.ForbiddenCode);
        await Assert.That(ErrorCodes(reset)).Contains(DomainErrors.ForbiddenCode);
        var after = await GetUserAsync(Admin);
        await Assert.That(after.FirstName).IsEqualTo(before.FirstName);
        await Assert.That(after.Role).IsEqualTo(UserRole.Admin);
        await Assert.That(after.PasswordHash).IsEqualTo(before.PasswordHash);
        await Assert.That(await CountUsersAsync("mia")).IsEqualTo(0);
    }

    [Test]
    public async Task DemotedAdminLosesAccessImmediately()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        var other = await CreateUserClientAsync("second@example.com", UserRole.Admin);
        await DataAsync(admin, UpdateUser, new
        {
            id = await GlobalIdAsync(admin, "second@example.com"),
            input = new { role = "USER" },
        });

        var root = await PostAsync(other, UsersQuery);

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ForbiddenCode);
    }

    [Test]
    public async Task AdminDoesNotReadAnotherUsersPersonalRecords()
    {
        var admin = await CreateUserClientAsync(Admin, UserRole.Admin);
        var luca = await CreateUserClientAsync(Luca);
        await BodyStatsGraphQl.AddAsync(luca, BodyStatsGraphQl.Input());

        var data = await DataAsync(admin, BodyStatsGraphQl.ListQuery);

        await Assert.That(Nodes(data, "bodyStats").Count).IsEqualTo(0);
    }

    // ---- rules ----

    [Test]
    public async Task RulesAllowUnchangedRoleAndOtherUsersDemotionWithSeveralAdmins()
    {
        var target = new User { Id = 2, Role = UserRole.Admin };

        UserAdminRules.CheckRoleChange(callerId: 1, target, UserRole.Admin, adminCount: 1);
        UserAdminRules.CheckRoleChange(callerId: 1, target, UserRole.User, adminCount: 2);

        await Assert.That(target.Role).IsEqualTo(UserRole.Admin);
    }

    [Test]
    public async Task RulesRejectOwnRoleChangeAndLastAdminDemotion()
    {
        var self = new User { Id = 1, Role = UserRole.Admin };
        var last = new User { Id = 2, Role = UserRole.Admin };

        var own = Assert.Throws<GraphQLException>(() =>
            UserAdminRules.CheckRoleChange(callerId: 1, self, UserRole.User, adminCount: 2));
        var lastAdmin = Assert.Throws<GraphQLException>(() =>
            UserAdminRules.CheckRoleChange(callerId: 1, last, UserRole.User, adminCount: 1));

        await Assert.That(own.Errors[0].Code).IsEqualTo(DomainErrors.CannotChangeOwnRoleCode);
        await Assert.That(lastAdmin.Errors[0].Code).IsEqualTo(DomainErrors.LastAdminCode);
    }

    // ---- helpers ----

    private static async Task AssertValidationErrorAsync(JsonElement root, string field)
    {
        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        var fields = root.GetProperty("errors").EnumerateArray()
            .Select(e => e.GetProperty("extensions").TryGetProperty("field", out var f) ? f.GetString() : null);
        await Assert.That(fields).Contains(field);
    }

    /// <summary>The Relay global id of a user, read through the admin list like the frontend does.</summary>
    private static async Task<string> GlobalIdAsync(HttpClient admin, string username)
    {
        var users = (await DataAsync(admin, UsersQuery)).GetProperty("users").EnumerateArray();
        return users.Single(u => u.GetProperty("username").GetString() == username).GetProperty("id").GetString()!;
    }

    private async Task<User> GetUserAsync(string username)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await db.Users.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]).AsNoTracking()
            .SingleAsync(u => u.Username == username);
    }

    private async Task<int> CountUsersAsync(string username)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await db.Users.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]).CountAsync(u => u.Username == username);
    }

    private async Task<int> SetPasswordAsync(string username, string password)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        var user = await db.Users.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]).SingleAsync(u => u.Username == username);
        user.PasswordHash = Hasher.HashPassword(password);
        await db.SaveChangesAsync();
        return user.Id;
    }

    private async Task AddRefreshTokensAsync(int userId, int count)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        for (var i = 0; i < count; i++)
        {
            db.RefreshTokens.Add(new RefreshToken
            {
                UserId = userId,
                TokenHash = Guid.NewGuid().ToString("N"),
                FamilyId = Guid.NewGuid(),
                Created = DateTime.UtcNow,
                CreatedByIp = "127.0.0.1",
                ExpiresAt = DateTime.UtcNow.AddDays(7),
            });
        }

        await db.SaveChangesAsync();
    }

    private async Task<List<RefreshToken>> GetRefreshTokensAsync(int userId)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await db.RefreshTokens.IgnoreQueryFilters().AsNoTracking().Where(t => t.UserId == userId).ToListAsync();
    }
}
