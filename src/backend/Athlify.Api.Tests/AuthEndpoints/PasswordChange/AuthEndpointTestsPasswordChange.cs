using System.Net;
using System.Text.Json;

namespace Athlify.Api.Tests.AuthEndpoints.PasswordChange;

public class PasswordChangeTestFactory : AuthApiFactory
{
    override public string ContentRootPath => Path.Combine(RootPath, "PasswordChange");
    override protected Action<Athlify.Api.Database.AthlifyDbContext> SeedDbFunc { get; set; } = db =>
    {
        AddTestUser(db, "test", "old-secret");
    };
}

[Category("Auth")]
[ClassDataSource<AuthApiTestFixture<PasswordChangeTestFactory>>(Shared = SharedType.PerClass)]
public sealed class AuthEndpointTestsPasswordChange(AuthApiTestFixture<PasswordChangeTestFactory> fixture)
    : AuthEndpointsTestsBase<PasswordChangeTestFactory>(fixture)
{
    [Test]
    public async Task UpdateMe_ChangingThePassword_RevokesSessionsAndSwitchesLogin()
    {
        using var loginResponse = await LoginAsync("test", "old-secret");
        var (_, refreshCookie, accessToken) = await TestAndAddRtandAtAsync(loginResponse, isLogin: true);

        using var updateResponse = await PostGraphQl(
            fixture.Client,
            "mutation { updateMe(input: { passwordChange: { currentPassword: \"old-secret\", newPassword: \"new-secret\" } }) { username } }",
            accessToken);
        using var updateBody = JsonDocument.Parse(await updateResponse.Content.ReadAsStringAsync());
        await Assert.That(updateBody.RootElement.TryGetProperty("errors", out _)).IsFalse();

        using var refreshResponse = await RefreshTokenAsync(refreshCookie);
        await Assert.That(refreshResponse.StatusCode).IsEqualTo(HttpStatusCode.Unauthorized);

        using var oldLogin = await LoginAsync("test", "old-secret");
        await Assert.That(oldLogin.StatusCode).IsEqualTo(HttpStatusCode.Unauthorized);

        using var newLogin = await LoginAsync("test", "new-secret");
        await Assert.That(newLogin.StatusCode).IsEqualTo(HttpStatusCode.OK);
    }
}
