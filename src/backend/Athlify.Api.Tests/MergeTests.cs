using System.Text.Json;
using Athlify.Api.Domain.Common;
using static Athlify.Api.Tests.DomainGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class MergeTests : WebApiTestBase
{
    private const string MergeFields = "id name totalTime totalDistance totalElevationGain totalTss activities { id }";

    private static readonly string Create = $$"""
        mutation($name: String, $ids: [ID!]!) { createActivityMerge(name: $name, activityIds: $ids) { {{MergeFields}} } }
        """;

    private static readonly string Add = $$"""
        mutation($merge: ID!, $activity: ID!) { addActivityToMerge(mergeId: $merge, activityId: $activity) { {{MergeFields}} } }
        """;

    private static readonly string Remove = $$"""
        mutation($merge: ID!, $activity: ID!) { removeActivityFromMerge(mergeId: $merge, activityId: $activity) { {{MergeFields}} } }
        """;

    private static readonly string Node = $$"""
        query($id: ID!) { node(id: $id) { ... on ActivityMerge { {{MergeFields}} } } }
        """;

    private const string ActivityMergeQuery = "query($id: ID!) { node(id: $id) { ... on Activity { merge { id } } } }";

    private static async Task<JsonElement> CreateMergeAsync(HttpClient client, params string[] ids) =>
        (await DataAsync(client, Create, new { name = "Two-part ride", ids })).GetProperty("createActivityMerge");

    private static async Task<JsonElement> MergeOfAsync(HttpClient client, string activityId) =>
        (await DataAsync(client, ActivityMergeQuery, new { id = activityId })).GetProperty("node").GetProperty("merge");

    [Test]
    public async Task TotalsSumTheActiveMembers()
    {
        var client = await CreateUserClientAsync();
        var first = Id(await CreateActivityAsync(client, ActivityInput(time: 3600, distance: 30, elevationGain: 400)));
        var second = Id(await CreateActivityAsync(client, ActivityInput(time: 1800, distance: 12.5)));

        var merge = await CreateMergeAsync(client, first, second);

        await Assert.That(merge.GetProperty("name").GetString()).IsEqualTo("Two-part ride");
        await Assert.That(merge.GetProperty("totalTime").GetInt32()).IsEqualTo(5400);
        await Assert.That(merge.GetProperty("totalDistance").GetDouble()).IsEqualTo(42.5);
        await Assert.That(merge.GetProperty("totalElevationGain").GetDouble()).IsEqualTo(400.0);
        await Assert.That(IsNull(merge.GetProperty("totalTss"))).IsTrue();
        await Assert.That(Ids(merge.GetProperty("activities").EnumerateArray())).IsEquivalentTo(new[] { first, second });
        await Assert.That(Id(await MergeOfAsync(client, first))).IsEqualTo(Id(merge));
    }

    [Test]
    public async Task CreateRejectsInvalidMembers()
    {
        var client = await CreateUserClientAsync();
        var other = await CreateUserClientAsync("mia@example.com");
        var a = Id(await CreateActivityAsync(client));
        var b = Id(await CreateActivityAsync(client));
        var c = Id(await CreateActivityAsync(client));
        var deleted = Id(await CreateActivityAsync(client));
        var foreign = Id(await CreateActivityAsync(other));
        await DataAsync(client, DeleteActivityMutation, new { id = deleted });
        await CreateMergeAsync(client, a, b);

        foreach (var ids in new[] { new[] { c }, new[] { c, c }, new[] { c, deleted }, new[] { c, foreign }, new[] { c, a } })
        {
            var root = await PostAsync(client, Create, new { name = (string?)null, ids });
            await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        }

        await Assert.That(IsNull(await MergeOfAsync(client, c))).IsTrue();
    }

    [Test]
    public async Task AddingUpdatesTotalsAndAMergedActivityCannotJoinAnother()
    {
        var client = await CreateUserClientAsync();
        var ids = new List<string>();
        for (var i = 0; i < 5; i++)
            ids.Add(Id(await CreateActivityAsync(client, ActivityInput(time: 600, distance: 5))));
        var first = Id(await CreateMergeAsync(client, ids[0], ids[1]));
        var second = Id(await CreateMergeAsync(client, ids[2], ids[3]));

        var added = (await DataAsync(client, Add, new { merge = first, activity = ids[4] })).GetProperty("addActivityToMerge");
        var stolen = await PostAsync(client, Add, new { merge = first, activity = ids[2] });

        await Assert.That(added.GetProperty("totalTime").GetInt32()).IsEqualTo(1800);
        await Assert.That(added.GetProperty("activities").GetArrayLength()).IsEqualTo(3);
        await Assert.That(ErrorCodes(stolen)).Contains(DomainErrors.ValidationCode);
        await Assert.That(Id(await MergeOfAsync(client, ids[2]))).IsEqualTo(second);
    }

    [Test]
    public async Task RemovingFromThreeKeepsTheMergeAndRemovingFromTwoDissolvesIt()
    {
        var client = await CreateUserClientAsync();
        var a = Id(await CreateActivityAsync(client, ActivityInput(distance: 10)));
        var b = Id(await CreateActivityAsync(client, ActivityInput(distance: 20)));
        var c = Id(await CreateActivityAsync(client, ActivityInput(distance: 30)));
        var merge = Id(await CreateMergeAsync(client, a, b, c));

        var kept = (await DataAsync(client, Remove, new { merge, activity = c })).GetProperty("removeActivityFromMerge");
        var dissolved = (await DataAsync(client, Remove, new { merge, activity = b })).GetProperty("removeActivityFromMerge");

        await Assert.That(kept.GetProperty("totalDistance").GetDouble()).IsEqualTo(30.0);
        await Assert.That(kept.GetProperty("activities").GetArrayLength()).IsEqualTo(2);
        await Assert.That(IsNull(dissolved)).IsTrue();
        await Assert.That(IsNull((await DataAsync(client, Node, new { id = merge })).GetProperty("node"))).IsTrue();
        await Assert.That(IsNull(await MergeOfAsync(client, a))).IsTrue();
        await Assert.That(Nodes(await DataAsync(client, ActivitiesQuery), "activities").Count).IsEqualTo(3);
    }

    [Test]
    public async Task SoftDeletingAMemberOfTwoDissolvesTheMerge()
    {
        var client = await CreateUserClientAsync();
        var a = Id(await CreateActivityAsync(client));
        var b = Id(await CreateActivityAsync(client));
        var merge = Id(await CreateMergeAsync(client, a, b));

        await DataAsync(client, DeleteActivityMutation, new { id = b });

        await Assert.That(IsNull((await DataAsync(client, Node, new { id = merge })).GetProperty("node"))).IsTrue();
        await Assert.That(IsNull(await MergeOfAsync(client, a))).IsTrue();
        // The remaining activity can be merged again.
        var c = Id(await CreateActivityAsync(client));
        await Assert.That((await CreateMergeAsync(client, a, c)).GetProperty("activities").GetArrayLength()).IsEqualTo(2);
    }

    [Test]
    public async Task SoftDeletingAMemberOfThreeUpdatesTheTotals()
    {
        var client = await CreateUserClientAsync();
        var a = Id(await CreateActivityAsync(client, ActivityInput(distance: 10)));
        var b = Id(await CreateActivityAsync(client, ActivityInput(distance: 20)));
        var c = Id(await CreateActivityAsync(client, ActivityInput(distance: 30)));
        var merge = Id(await CreateMergeAsync(client, a, b, c));

        await DataAsync(client, DeleteActivityMutation, new { id = c });

        var node = (await DataAsync(client, Node, new { id = merge })).GetProperty("node");
        await Assert.That(node.GetProperty("totalDistance").GetDouble()).IsEqualTo(30.0);
        await Assert.That(Ids(node.GetProperty("activities").EnumerateArray())).IsEquivalentTo(new[] { a, b });
    }

    [Test]
    public async Task UpdatingAMemberUpdatesTheTotals()
    {
        var client = await CreateUserClientAsync();
        var a = Id(await CreateActivityAsync(client, ActivityInput(distance: 10)));
        var b = Id(await CreateActivityAsync(client, ActivityInput(distance: 20)));
        var merge = Id(await CreateMergeAsync(client, a, b));

        await DataAsync(client, UpdateActivityMutation, new { id = a, input = ActivityInput(distance: 15) });

        var node = (await DataAsync(client, Node, new { id = merge })).GetProperty("node");
        await Assert.That(node.GetProperty("totalDistance").GetDouble()).IsEqualTo(35.0);
    }

    [Test]
    public async Task DeleteDissolvesTheMergeAndKeepsTheActivities()
    {
        var client = await CreateUserClientAsync();
        var a = Id(await CreateActivityAsync(client));
        var b = Id(await CreateActivityAsync(client));
        var merge = Id(await CreateMergeAsync(client, a, b));

        var deleted = (await DataAsync(client, "mutation($id: ID!) { deleteActivityMerge(id: $id) }", new { id = merge }))
            .GetProperty("deleteActivityMerge");

        await Assert.That(deleted.GetString()).IsEqualTo(merge);
        await Assert.That(Nodes(await DataAsync(client, ActivitiesQuery), "activities").Count).IsEqualTo(2);
        await Assert.That(IsNull(await MergeOfAsync(client, a))).IsTrue();
        await Assert.That(Nodes(await DataAsync(client, "query { activityMerges { nodes { id } } }"), "activityMerges").Count).IsEqualTo(0);
    }

    [Test]
    public async Task RenameChangesOnlyTheName()
    {
        var client = await CreateUserClientAsync();
        var merge = await CreateMergeAsync(client, Id(await CreateActivityAsync(client)), Id(await CreateActivityAsync(client)));

        var renamed = (await DataAsync(client,
            $"mutation($id: ID!) {{ renameActivityMerge(id: $id, name: \"Brevet\") {{ {MergeFields} }} }}",
            new { id = Id(merge) })).GetProperty("renameActivityMerge");

        await Assert.That(renamed.GetProperty("name").GetString()).IsEqualTo("Brevet");
        await Assert.That(renamed.GetProperty("totalTime").GetInt32()).IsEqualTo(merge.GetProperty("totalTime").GetInt32());
    }

    [Test]
    public async Task ForeignMergeBehavesAsMissing()
    {
        var luca = await CreateUserClientAsync();
        var mia = await CreateUserClientAsync("mia@example.com");
        var merge = Id(await CreateMergeAsync(luca, Id(await CreateActivityAsync(luca)), Id(await CreateActivityAsync(luca))));
        var miasActivity = Id(await CreateActivityAsync(mia));

        var node = (await DataAsync(mia, Node, new { id = merge })).GetProperty("node");
        var add = (await DataAsync(mia, Add, new { merge, activity = miasActivity })).GetProperty("addActivityToMerge");
        var delete = (await DataAsync(mia, "mutation($id: ID!) { deleteActivityMerge(id: $id) }", new { id = merge }))
            .GetProperty("deleteActivityMerge");

        await Assert.That(IsNull(node)).IsTrue();
        await Assert.That(IsNull(add)).IsTrue();
        await Assert.That(IsNull(delete)).IsTrue();
        await Assert.That((await DataAsync(luca, Node, new { id = merge })).GetProperty("node").GetProperty("activities").GetArrayLength())
            .IsEqualTo(2);
    }
}
