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

/// <summary>The same isolation rules for tags, bicycles and activities.</summary>
public class DomainOwnershipTests : WebApiTestBase
{
    [Test]
    public async Task ListsShowOnlyOwnRecords()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        var mia = await CreateUserClientAsync("mia@example.com");
        var tag = DomainGraphQl.Id(await DomainGraphQl.CreateTagAsync(luca, "race"));
        var vehicle = DomainGraphQl.Id(await DomainGraphQl.CreateVehicleAsync(luca));
        await DomainGraphQl.CreateActivityAsync(luca, DomainGraphQl.ActivityInput(vehicleId: vehicle, tagIds: [tag]));

        var data = await DataAsync(mia, "query { tags { nodes { id } } vehicles { nodes { id } } activities { nodes { id } } }");

        foreach (var field in new[] { "tags", "vehicles", "activities" })
        {
            await Assert.That(Nodes(data, field).Count).IsEqualTo(0);
        }
    }

    [Test]
    public async Task ForeignRecordsBehaveAsMissing()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        var mia = await CreateUserClientAsync("mia@example.com");
        var tag = DomainGraphQl.Id(await DomainGraphQl.CreateTagAsync(luca, "race"));
        var vehicle = DomainGraphQl.Id(await DomainGraphQl.CreateVehicleAsync(luca));
        var activity = DomainGraphQl.Id(await DomainGraphQl.CreateActivityAsync(luca));

        var data = await DataAsync(mia, """
            mutation($tag: ID!, $vehicle: ID!, $activity: ID!) {
              updateTag(id: $tag, tag: { name: "mine" }) { id }
              deleteTag(id: $tag)
              deleteVehicle(id: $vehicle)
              deleteActivity(id: $activity)
            }
            """, new { tag, vehicle, activity });
        const string nodes = "query($ids: [ID!]!) { nodes(ids: $ids) { id } }";
        var stillThere = (await DataAsync(luca, nodes, new { ids = new[] { tag, vehicle, activity } })).GetProperty("nodes");

        foreach (var field in new[] { "updateTag", "deleteTag", "deleteVehicle", "deleteActivity" })
        {
            await Assert.That(IsNull(data.GetProperty(field))).IsTrue();
        }

        await Assert.That(stillThere.EnumerateArray().Count(n => !IsNull(n))).IsEqualTo(3);
    }

    [Test]
    public async Task LinkingAForeignTagOrBicycleIsRejected()
    {
        var luca = await CreateUserClientAsync("luca@example.com");
        var mia = await CreateUserClientAsync("mia@example.com");
        var lucasTag = DomainGraphQl.Id(await DomainGraphQl.CreateTagAsync(luca, "race"));
        var lucasBike = DomainGraphQl.Id(await DomainGraphQl.CreateVehicleAsync(luca));

        var withTag = await PostAsync(mia, DomainGraphQl.CreateActivityMutation,
            new { input = DomainGraphQl.ActivityInput(tagIds: [lucasTag]) });
        var withBike = await PostAsync(mia, DomainGraphQl.CreateActivityMutation,
            new { input = DomainGraphQl.ActivityInput(vehicleId: lucasBike) });
        var bikeWithTag = await PostAsync(mia, DomainGraphQl.CreateVehicleMutation,
            new { input = DomainGraphQl.VehicleInput(tagIds: [lucasTag]) });

        await Assert.That(ErrorCodes(withTag)).Contains(DomainErrors.ValidationCode);
        await Assert.That(ErrorCodes(withBike)).Contains(DomainErrors.ValidationCode);
        await Assert.That(ErrorCodes(bikeWithTag)).Contains(DomainErrors.ValidationCode);
        var miasData = await DataAsync(mia, "query { vehicles { nodes { id } } activities { nodes { id } } }");
        await Assert.That(Nodes(miasData, "activities").Count).IsEqualTo(0);
        await Assert.That(Nodes(miasData, "vehicles").Count).IsEqualTo(0);
    }
}
