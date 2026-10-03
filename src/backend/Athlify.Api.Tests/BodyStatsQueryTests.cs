using TUnit.Assertions.Enums;
using System.Text.Json;
using static Athlify.Api.Tests.BodyStatsGraphQl;

namespace Athlify.Api.Tests;

public class BodyStatsQueryTests : WebApiTestBase
{
    [Test]
    public async Task ListIsEmptyWithoutData()
    {
        var data = await DataAsync(Factory.CreateClient(), ListQuery);

        await Assert.That(data.GetProperty("bodyStats").GetArrayLength()).IsEqualTo(0);
    }

    [Test]
    public async Task IdsAreGlobalIdsAndNodeResolvesTheSameEntry()
    {
        var client = Factory.CreateClient();
        var added = await AddAsync(client, Input(weight: 66.6));

        var listed = (await DataAsync(client, ListQuery)).GetProperty("bodyStats").EnumerateArray().Single();
        var id = listed.GetProperty("id").GetString()!;
        await Assert.That(id).IsEqualTo(added.GetProperty("id").GetString());
        await Assert.That(int.TryParse(id, out _)).IsFalse();

        var node = (await DataAsync(client, NodeQuery, new { id })).GetProperty("node");
        await Assert.That(node.GetProperty("weight").GetDouble()).IsEqualTo(66.6);
    }

    [Test]
    public async Task CommentsAreReturnedWithTheList()
    {
        var client = Factory.CreateClient();
        await AddAsync(client, Input(comments: [NewComment("first")]));

        var listed = (await DataAsync(client, ListQuery)).GetProperty("bodyStats").EnumerateArray().Single();

        await Assert.That(CommentContents(listed)).IsEquivalentTo(new[] { "first" });
    }

    [Test]
    public async Task ListIsOrderedByDateDescending()
    {
        var client = Factory.CreateClient();
        var today = DateTime.UtcNow.Date;
        await AddAsync(client, Input(date: today.AddDays(-2), weight: 72));
        await AddAsync(client, Input(date: today, weight: 70));
        await AddAsync(client, Input(date: today.AddDays(-1), weight: 71));

        var weights = (await DataAsync(client, ListQuery)).GetProperty("bodyStats")
            .EnumerateArray().Select(e => e.GetProperty("weight").GetDouble()).ToList();

        await Assert.That(weights).IsEquivalentTo(new[] { 70.0, 71.0, 72.0 }, CollectionOrdering.Matching);
    }
}
