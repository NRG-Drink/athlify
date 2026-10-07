using TUnit.Assertions.Enums;
using System.Text.Json;
using static Athlify.Api.Tests.BodyStatsGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class BodyStatsQueryTests : WebApiTestBase
{
    [Test]
    public async Task ListIsEmptyWithoutData()
    {
        var data = await DataAsync(await CreateUserClientAsync(), ListQuery);

        await Assert.That(data.GetProperty("bodyStats").GetProperty("nodes").GetArrayLength()).IsEqualTo(0);
    }

    [Test]
    public async Task IdsAreGlobalIdsAndNodeResolvesTheSameEntry()
    {
        var client = await CreateUserClientAsync();
        var added = await AddAsync(client, Input(weight: 66.6));

        var listed = (await DataAsync(client, ListQuery)).GetProperty("bodyStats").GetProperty("nodes").EnumerateArray().Single();
        var id = listed.GetProperty("id").GetString()!;
        await Assert.That(id).IsEqualTo(added.GetProperty("id").GetString());
        await Assert.That(int.TryParse(id, out _)).IsFalse();

        var node = (await DataAsync(client, NodeQuery, new { id })).GetProperty("node");
        await Assert.That(node.GetProperty("weight").GetDouble()).IsEqualTo(66.6);
    }

    [Test]
    public async Task CommentsAreReturnedWithTheList()
    {
        var client = await CreateUserClientAsync();
        await AddAsync(client, Input(comment: "first"));

        var listed = (await DataAsync(client, ListQuery)).GetProperty("bodyStats").GetProperty("nodes").EnumerateArray().Single();

        await Assert.That(listed.GetProperty("comment").GetString()).IsEqualTo("first");
    }

    [Test]
    public async Task ListIsOrderedByDateDescending()
    {
        var client = await CreateUserClientAsync();
        var today = DateTime.UtcNow.Date;
        await AddAsync(client, Input(date: today.AddDays(-2), weight: 72));
        await AddAsync(client, Input(date: today, weight: 70));
        await AddAsync(client, Input(date: today.AddDays(-1), weight: 71));

        var weights = (await DataAsync(client, ListQuery)).GetProperty("bodyStats").GetProperty("nodes")
            .EnumerateArray().Select(e => e.GetProperty("weight").GetDouble()).ToList();

        await Assert.That(weights).IsEquivalentTo(new[] { 70.0, 71.0, 72.0 }, CollectionOrdering.Matching);
    }

    [Test]
    public async Task ListIsAConnectionThatPagesWithoutSkippingOrRepeating()
    {
        var client = await CreateUserClientAsync();
        var sameDay = DateTime.UtcNow.Date;
        // Equal dates: the id decides the order, so the cursor must not skip or repeat entries.
        foreach (var weight in new[] { 70.0, 71.0, 72.0 })
            await AddAsync(client, Input(date: sameDay, weight: weight));

        const string page = """
            query($after: String) {
              bodyStats(first: 2, after: $after) {
                edges { cursor node { weight } }
                pageInfo { hasNextPage endCursor }
              }
            }
            """;
        var first = (await DataAsync(client, page)).GetProperty("bodyStats");
        var cursor = first.GetProperty("pageInfo").GetProperty("endCursor").GetString();
        var second = (await DataAsync(client, page, new { after = cursor })).GetProperty("bodyStats");

        var weights = first.GetProperty("edges").EnumerateArray()
            .Concat(second.GetProperty("edges").EnumerateArray())
            .Select(e => e.GetProperty("node").GetProperty("weight").GetDouble()).ToList();
        await Assert.That(first.GetProperty("pageInfo").GetProperty("hasNextPage").GetBoolean()).IsTrue();
        await Assert.That(second.GetProperty("pageInfo").GetProperty("hasNextPage").GetBoolean()).IsFalse();
        await Assert.That(weights.Distinct().Count()).IsEqualTo(3);
    }
}
