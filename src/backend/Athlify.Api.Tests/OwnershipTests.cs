using Athlify.Api.Domain.Common;
using static Athlify.Api.Tests.BodyStatsGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

/// <summary>Every user sees and changes only their own records; another user's id behaves like an unknown id.</summary>
public class OwnershipTests : WebApiTestBase
{
    [Test]
    public async Task BodyStatsListShowsOnlyOwnEntries()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        var mia = await CreateUserClientAsync("mia@example.com");
        await AddAsync(luca, Input(weight: 70));

        var lucasList = Nodes(await DataAsync(luca, ListQuery), "bodyStats");
        var miasList = Nodes(await DataAsync(mia, ListQuery), "bodyStats");

        await Assert.That(lucasList.Count).IsEqualTo(1);
        await Assert.That(miasList.Count).IsEqualTo(0);
    }

    [Test]
    public async Task ForeignBodyStatsIdBehavesAsMissing()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        var mia = await CreateUserClientAsync("mia@example.com");
        var id = (await AddAsync(luca, Input(weight: 70))).GetProperty("id").GetString()!;

        var node = (await DataAsync(mia, NodeQuery, new { id })).GetProperty("node");
        var updated = (await DataAsync(mia, UpdateMutation, new { id, input = Input(weight: 99) })).GetProperty("updateBodyStats");
        var deleted = (await DataAsync(mia, DeleteMutation, new { id })).GetProperty("deleteBodyStats");
        var stillThere = (await DataAsync(luca, NodeQuery, new { id })).GetProperty("node");

        await Assert.That(IsNull(node)).IsTrue();
        await Assert.That(IsNull(updated)).IsTrue();
        await Assert.That(IsNull(deleted)).IsTrue();
        await Assert.That(stillThere.GetProperty("weight").GetDouble()).IsEqualTo(70.0);
    }

    [Test]
    public async Task RequestWithoutUserIsRejected()
    {
        var anonymous = Factory.CreateClient();

        var list = await PostAsync(anonymous, ListQuery);
        var add = await PostAsync(anonymous, AddMutation, new { input = Input() });

        await Assert.That(ErrorCodes(list)).Contains(DomainErrors.NotAuthenticatedCode);
        await Assert.That(ErrorCodes(add)).Contains(DomainErrors.NotAuthenticatedCode);
    }
}
