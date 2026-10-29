using Athlify.Api.Database;
using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Users;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Athlify.Api.Tests.AuthEndpoints.UserScope;

public class UserScopeTestFactory : AuthApiFactory
{
    override public string ContentRootPath => Path.Combine(RootPath, "UserScope");
    override protected Action<AthlifyDbContext> SeedDbFunc { get; set; } = db =>
    {
        var user1 = AddTestUser(db);
        var user2 = AddTestUser(db, "other", "other", UserRole.User);

        db.Activities.AddRange(
            new Activity { UserId = user1.Id, Description = "user1's activity", },
            new Activity { UserId = user2.Id, Description = "user2's activity", });
    };
}

[Category("Auth")]
[ClassDataSource<AuthApiTestFixture<UserScopeTestFactory>>(Shared = SharedType.PerClass)]
public sealed class UserScopeTests(AuthApiTestFixture<UserScopeTestFactory> fixture) : AuthEndpointsTestsBase<UserScopeTestFactory>(fixture)
{
    [Test]
    public async Task Access_WithValidToken_ShouldReturnOnlyOwnActivities()
    {
        using var loginResponse = await LoginAsync("test", "test");
        var (_, _, accessToken) = await TestAndAddRtandAtAsync(loginResponse, isLogin: true);

        using var response = await PostGraphQl(
            fixture.Client,
            "{ activities(first: 200) { nodes { description } } }",
            accessToken);
        var content = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(content);
        if (document.RootElement.TryGetProperty("errors", out var errors))
        {
            Assert.Fail($"GraphQL request returned errors: {errors.GetRawText()}");
        }

        var activities = document.RootElement
            .GetProperty("data")
            .GetProperty("activities")
            .GetProperty("nodes");

        await Assert.That(activities.GetArrayLength()).IsEqualTo(1);
        await Assert.That(activities[0].GetProperty("description").GetString()).IsEqualTo("user1's activity");
    }
}
