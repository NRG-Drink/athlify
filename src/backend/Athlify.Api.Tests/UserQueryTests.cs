using Athlify.Api.Domain.Users;
using static Athlify.Api.Tests.BodyStatsGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class UserQueryTests : WebApiTestBase
{
    [Test]
    public async Task MeReturnsTheSignedInUser()
    {
        var client = await CreateUserClientAsync("admin@example.com", Role.Administrator);

        var me = (await DataAsync(client, "query { me { id email role language } }")).GetProperty("me");

        await Assert.That(me.GetProperty("email").GetString()).IsEqualTo("admin@example.com");
        await Assert.That(me.GetProperty("role").GetString()).IsEqualTo("ADMINISTRATOR");
        await Assert.That(me.GetProperty("language").GetString()).IsEqualTo("DE");
    }

    [Test]
    public async Task PasswordHashIsNotPartOfTheSchema()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, "query { me { passwordHash } }");

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
    }

    [Test]
    public async Task OwnerIdIsNotPartOfTheSchema()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, "query { bodyStats { nodes { userId } } }");

        await Assert.That(root.TryGetProperty("errors", out _)).IsTrue();
    }

    [Test]
    public async Task NodeResolvesOnlyTheSignedInUser()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        var mia = await CreateUserClientAsync("mia@example.com");
        var lucasId = (await DataAsync(luca, "query { me { id } }")).GetProperty("me").GetProperty("id").GetString();

        const string node = "query($id: ID!) { node(id: $id) { ... on User { email } } }";
        var own = (await DataAsync(luca, node, new { id = lucasId })).GetProperty("node");
        var foreign = (await DataAsync(mia, node, new { id = lucasId })).GetProperty("node");

        await Assert.That(own.GetProperty("email").GetString()).IsEqualTo("luca@example.com");
        await Assert.That(IsNull(foreign)).IsTrue();
    }

    [Test]
    public async Task TwoRootFieldsInOneRequestShareTheDbContext()
    {
        var client = await CreateUserClientAsync();
        await AddAsync(client, Input());

        var data = await DataAsync(client, "query { me { email } bodyStats { nodes { id } } }");

        await Assert.That(data.GetProperty("me").GetProperty("email").GetString()).IsEqualTo("luca@example.com");
        await Assert.That(Nodes(data, "bodyStats").Count).IsEqualTo(1);
    }

    [Test]
    public async Task ServerSetsTimestampsAndKeepsCreatedAtOnUpdate()
    {
        var client = await CreateUserClientAsync();
        var added = await AddAsync(client, Input(weight: 70));
        var id = added.GetProperty("id").GetString()!;

        var updated = (await DataAsync(client, UpdateMutation, new { id, input = Input(weight: 71) }))
            .GetProperty("updateBodyStats");

        await Assert.That(updated.GetProperty("createdAt").GetDateTime()).IsEqualTo(added.GetProperty("createdAt").GetDateTime());
        await Assert.That(updated.GetProperty("modifiedAt").GetDateTime()).IsGreaterThan(added.GetProperty("modifiedAt").GetDateTime());
    }
}
