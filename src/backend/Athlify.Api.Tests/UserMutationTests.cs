using Athlify.Api.Database;
using Athlify.Api.Domain.Auth;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class UserMutationTests : WebApiTestBase
{
    private const string UpdateMe = """
        mutation($input: UpdateMeInput!) {
          updateMe(input: $input) { username role firstName lastName language }
        }
        """;

    private static readonly HashService Hasher = new();

    [Test]
    public async Task UpdateMeChangesNameAndLanguage()
    {
        var client = await CreateUserClientAsync();

        var me = (await DataAsync(client, UpdateMe, new
        {
            input = new { firstName = "  Luca ", lastName = "Rossi", language = "EN" },
        })).GetProperty("updateMe");

        await Assert.That(me.GetProperty("firstName").GetString()).IsEqualTo("Luca");
        await Assert.That(me.GetProperty("lastName").GetString()).IsEqualTo("Rossi");
        await Assert.That(me.GetProperty("language").GetString()).IsEqualTo("EN");
        var stored = await GetUserAsync("luca@example.com");
        await Assert.That(stored.FirstName).IsEqualTo("Luca");
        await Assert.That(stored.Language).IsEqualTo(Language.En);
    }

    [Test]
    public async Task UpdateMeKeepsOmittedFields()
    {
        var client = await CreateUserClientAsync();

        await DataAsync(client, UpdateMe, new { input = new { language = "EN" } });

        var stored = await GetUserAsync("luca@example.com");
        await Assert.That(stored.FirstName).IsEqualTo("Test");
        await Assert.That(stored.LastName).IsEqualTo("luca@example.com");
        await Assert.That(stored.Language).IsEqualTo(Language.En);
    }

    [Test]
    public async Task UpdateMeDoesNotTouchOtherUsers()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        await CreateUserClientAsync("mia@example.com");

        await DataAsync(luca, UpdateMe, new { input = new { firstName = "Changed", language = "EN" } });

        var mia = await GetUserAsync("mia@example.com");
        await Assert.That(mia.FirstName).IsEqualTo("Test");
        await Assert.That(mia.Language).IsEqualTo(Language.De);
    }

    [Test]
    public async Task UpdateMeKeepsRoleAndUsername()
    {
        var client = await CreateUserClientAsync("luca@example.com", UserRole.User);

        var me = (await DataAsync(client, UpdateMe, new { input = new { firstName = "Luca" } })).GetProperty("updateMe");

        await Assert.That(me.GetProperty("username").GetString()).IsEqualTo("luca@example.com");
        await Assert.That(me.GetProperty("role").GetString()).IsEqualTo("USER");
    }

    [Test]
    [Arguments("id")]
    [Arguments("userId")]
    [Arguments("role")]
    [Arguments("username")]
    public async Task UpdateMeInputHasNoIdRoleOrUsername(string field)
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, UpdateMe, new { input = new Dictionary<string, object> { [field] = "1" } });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
    }

    [Test]
    [Arguments("firstName", "  ")]
    [Arguments("lastName", "")]
    public async Task UpdateMeRejectsBlankNames(string field, string value)
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, UpdateMe, new { input = new Dictionary<string, object> { [field] = value } });

        await AssertValidationErrorAsync(root, field);
        await Assert.That((await GetUserAsync("luca@example.com")).FirstName).IsEqualTo("Test");
    }

    [Test]
    public async Task UpdateMeRejectsOverlongNames()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, UpdateMe, new
        {
            input = new { firstName = new string('a', UpdateMeValidation.MaxNameLength + 1) },
        });

        await AssertValidationErrorAsync(root, "firstName");
    }

    [Test]
    public async Task UpdateMeRejectsUnsupportedLanguage()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, UpdateMe, new { input = new { language = "FR" } });

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
        await Assert.That((await GetUserAsync("luca@example.com")).Language).IsEqualTo(Language.De);
    }

    [Test]
    public async Task UpdateMeRequiresSignIn()
    {
        var anonymous = Factory.CreateClient();

        var root = await PostAsync(anonymous, UpdateMe, new { input = new { firstName = "Nobody" } });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.NotAuthenticatedCode);
    }

    [Test]
    public async Task ChangePasswordStoresNewHashAndRevokesAllTokens()
    {
        var client = await CreateUserClientAsync();
        var userId = await SetPasswordAsync("luca@example.com", "old-secret");
        await AddRefreshTokensAsync(userId, count: 2);

        await DataAsync(client, UpdateMe, new
        {
            input = new { passwordChange = new { currentPassword = "old-secret", newPassword = "new-secret" } },
        });

        var stored = await GetUserAsync("luca@example.com");
        await Assert.That(Hasher.VerifyPassword("new-secret", stored.PasswordHash)).IsTrue();
        await Assert.That(Hasher.VerifyPassword("old-secret", stored.PasswordHash)).IsFalse();
        var tokens = await GetRefreshTokensAsync(userId);
        await Assert.That(tokens.All(t => t.Revoked is not null)).IsTrue();
        await Assert.That(tokens.All(t => t.ReasonRevoked == RefreshToken.RevokeReason.PasswordChanged)).IsTrue();
    }

    [Test]
    public async Task ChangePasswordLeavesOtherUsersTokensAlone()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        await CreateUserClientAsync("mia@example.com");
        await SetPasswordAsync("luca@example.com", "old-secret");
        var miaId = (await GetUserAsync("mia@example.com")).Id;
        await AddRefreshTokensAsync(miaId, count: 1);

        await DataAsync(luca, UpdateMe, new
        {
            input = new { passwordChange = new { currentPassword = "old-secret", newPassword = "new-secret" } },
        });

        var tokens = await GetRefreshTokensAsync(miaId);
        await Assert.That(tokens.All(t => t.Revoked is null)).IsTrue();
    }

    [Test]
    public async Task ChangePasswordRequiresCurrentPassword()
    {
        var client = await CreateUserClientAsync();
        await SetPasswordAsync("luca@example.com", "old-secret");
        var before = (await GetUserAsync("luca@example.com")).PasswordHash;

        var root = await PostAsync(client, UpdateMe, new
        {
            input = new
            {
                firstName = "Changed",
                passwordChange = new { currentPassword = "wrong", newPassword = "new-secret" },
            },
        });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.CurrentPasswordIncorrectCode);
        var stored = await GetUserAsync("luca@example.com");
        await Assert.That(stored.PasswordHash).IsEqualTo(before);
        await Assert.That(stored.FirstName).IsEqualTo("Test");
    }

    [Test]
    public async Task ChangePasswordFailsForAccountWithoutPassword()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, UpdateMe, new
        {
            input = new { passwordChange = new { currentPassword = "anything", newPassword = "new-secret" } },
        });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.CurrentPasswordIncorrectCode);
        await Assert.That((await GetUserAsync("luca@example.com")).PasswordHash).IsNull();
    }

    [Test]
    public async Task ChangePasswordRejectsEmptyNewPassword()
    {
        var client = await CreateUserClientAsync();
        await SetPasswordAsync("luca@example.com", "old-secret");

        var root = await PostAsync(client, UpdateMe, new
        {
            input = new { passwordChange = new { currentPassword = "old-secret", newPassword = "  " } },
        });

        await AssertValidationErrorAsync(root, "newPassword");
        var stored = await GetUserAsync("luca@example.com");
        await Assert.That(Hasher.VerifyPassword("old-secret", stored.PasswordHash)).IsTrue();
    }

    [Test]
    public async Task PasswordIsNeverReturnedOrStoredInPlainText()
    {
        var client = await CreateUserClientAsync();
        await SetPasswordAsync("luca@example.com", "old-secret");

        var schemaRoot = await PostAsync(client, "mutation { updateMe(input: {}) { passwordHash } }");
        await DataAsync(client, UpdateMe, new
        {
            input = new { passwordChange = new { currentPassword = "old-secret", newPassword = "new-secret" } },
        });

        await Assert.That(schemaRoot.TryGetProperty("errors", out _)).IsTrue();
        var stored = await GetUserAsync("luca@example.com");
        await Assert.That(stored.PasswordHash).IsNotEqualTo("new-secret");
        await Assert.That(stored.PasswordHash).IsNotNull();
    }

    private static async Task AssertValidationErrorAsync(JsonElement root, string field)
    {
        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        var fields = root.GetProperty("errors").EnumerateArray()
            .Select(e => e.GetProperty("extensions").TryGetProperty("field", out var f) ? f.GetString() : null);
        await Assert.That(fields).Contains(field);
    }

    private async Task<User> GetUserAsync(string username)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AthlifyDbContext>();
        return await db.Users.IgnoreQueryFilters([AthlifyDbContext.OwnerFilter]).AsNoTracking()
            .SingleAsync(u => u.Username == username);
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
