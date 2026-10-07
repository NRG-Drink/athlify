using Athlify.Api.Domain.Common;
using static Athlify.Api.Tests.DomainGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class ActivityTests : WebApiTestBase
{
    [Test]
    public async Task CreateReturnsLinksIncludingNestedOnes()
    {
        var client = await CreateUserClientAsync();
        var gravel = Id(await CreateTagAsync(client, "gravel"));
        var race = Id(await CreateTagAsync(client, "race"));
        var vehicle = Id(await CreateVehicleAsync(client, VehicleInput(tagIds: [race])));

        var created = await CreateActivityAsync(client, ActivityInput(vehicleId: vehicle, tagIds: [gravel]));

        await Assert.That(TagNames(created)).IsEquivalentTo(new[] { "gravel" });
        await Assert.That(Id(created.GetProperty("vehicle"))).IsEqualTo(vehicle);
        await Assert.That(TagNames(created.GetProperty("vehicle"))).IsEquivalentTo(new[] { "race" });
        await Assert.That(created.GetProperty("source").GetString()).IsEqualTo("MANUAL");
        await Assert.That(IsNull(created.GetProperty("stravaActivityId"))).IsTrue();
    }

    [Test]
    public async Task ListAndNodeReturnNestedLinks()
    {
        var client = await CreateUserClientAsync();
        var race = Id(await CreateTagAsync(client, "race"));
        var vehicle = Id(await CreateVehicleAsync(client, VehicleInput(tagIds: [race])));
        var created = await CreateActivityAsync(client, ActivityInput(vehicleId: vehicle, tagIds: [race]));

        var listed = Nodes(await DataAsync(client, ActivitiesQuery), "activities").Single();
        var node = (await DataAsync(client, ActivityNodeQuery, new { id = Id(created) })).GetProperty("node");

        foreach (var activity in new[] { listed, node })
        {
            await Assert.That(TagNames(activity)).IsEquivalentTo(new[] { "race" });
            await Assert.That(TagNames(activity.GetProperty("vehicle"))).IsEquivalentTo(new[] { "race" });
        }
    }

    [Test]
    public async Task AverageSpeedIsCalculatedAndNotAnInput()
    {
        var client = await CreateUserClientAsync();

        var created = await CreateActivityAsync(client, ActivityInput(time: 3600, distance: 30));
        var updated = (await DataAsync(client, UpdateActivityMutation, new
        {
            id = Id(created),
            input = ActivityInput(time: 1800, distance: 20),
        })).GetProperty("updateActivity");
        var withSpeed = await PostAsync(client, CreateActivityMutation, new
        {
            input = new { date = DateTime.UtcNow, type = "ROAD", time = 60, distance = 1, averageSpeed = 99 },
        });

        await Assert.That(created.GetProperty("averageSpeed").GetDouble()).IsEqualTo(30.0);
        await Assert.That(updated.GetProperty("averageSpeed").GetDouble()).IsEqualTo(40.0);
        await Assert.That(withSpeed.TryGetProperty("errors", out _)).IsTrue();
    }

    [Test]
    public async Task UpdateReplacesEditableFieldsAndTags()
    {
        var client = await CreateUserClientAsync();
        var road = Id(await CreateTagAsync(client, "road"));
        var rain = Id(await CreateTagAsync(client, "rain"));
        var vehicle = Id(await CreateVehicleAsync(client));
        var created = await CreateActivityAsync(client, ActivityInput(vehicleId: vehicle, tagIds: [road]));

        var updated = (await DataAsync(client, UpdateActivityMutation, new
        {
            id = Id(created),
            input = ActivityInput(type: "GRAVEL", effort: 7, mood: "GOOD", wind: "STRONG",
                heartRateMin: 90, heartRateAverage: 140, heartRateMax: 180, elevationGain: 450, tagIds: [rain]),
        })).GetProperty("updateActivity");

        await Assert.That(updated.GetProperty("type").GetString()).IsEqualTo("GRAVEL");
        await Assert.That(updated.GetProperty("effort").GetInt32()).IsEqualTo(7);
        await Assert.That(updated.GetProperty("mood").GetString()).IsEqualTo("GOOD");
        await Assert.That(updated.GetProperty("wind").GetString()).IsEqualTo("STRONG");
        await Assert.That(updated.GetProperty("elevationGain").GetDouble()).IsEqualTo(450.0);
        await Assert.That(IsNull(updated.GetProperty("vehicle"))).IsTrue();
        await Assert.That(TagNames(updated)).IsEquivalentTo(new[] { "rain" });
        await Assert.That(updated.GetProperty("modifiedAt").GetDateTime()).IsGreaterThan(created.GetProperty("modifiedAt").GetDateTime());
    }

    [Test]
    [Arguments(0, 30.0, null, null, null, null)]
    [Arguments(3600, -1.0, null, null, null, null)]
    [Arguments(3600, 30.0, 11, null, null, null)]
    [Arguments(3600, 30.0, 0, null, null, null)]
    [Arguments(3600, 30.0, null, 150, 120, null)]
    [Arguments(3600, 30.0, null, 120, 150, 160)]
    [Arguments(3600, 30.0, null, 10, null, null)]
    public async Task InvalidValuesAreRejectedAndNothingIsStored(
        int time, double distance, int? effort, int? heartRateMin, int? heartRateMax, int? heartRateAverage)
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, CreateActivityMutation, new
        {
            input = ActivityInput(time: time, distance: distance, effort: effort,
                heartRateMin: heartRateMin, heartRateMax: heartRateMax, heartRateAverage: heartRateAverage),
        });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        await Assert.That(Nodes(await DataAsync(client, ActivitiesQuery), "activities").Count).IsEqualTo(0);
    }

    [Test]
    public async Task DateInTheFutureIsRejected()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, CreateActivityMutation, new
        {
            input = ActivityInput(date: DateTime.UtcNow.AddDays(3)),
        });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
    }

    [Test]
    public async Task DeleteIsSoftAndHidesTheActivity()
    {
        var client = await CreateUserClientAsync();
        var id = Id(await CreateActivityAsync(client));

        var first = (await DataAsync(client, DeleteActivityMutation, new { id })).GetProperty("deleteActivity");
        var second = (await DataAsync(client, DeleteActivityMutation, new { id })).GetProperty("deleteActivity");
        var node = (await DataAsync(client, ActivityNodeQuery, new { id })).GetProperty("node");
        var update = (await DataAsync(client, UpdateActivityMutation, new { id, input = ActivityInput() })).GetProperty("updateActivity");

        await Assert.That(first.GetString()).IsEqualTo(id);
        await Assert.That(IsNull(second)).IsTrue();
        await Assert.That(IsNull(node)).IsTrue();
        await Assert.That(IsNull(update)).IsTrue();
        await Assert.That(Nodes(await DataAsync(client, ActivitiesQuery), "activities").Count).IsEqualTo(0);
    }

    [Test]
    public async Task UnknownTagOrBicycleIsRejected()
    {
        var client = await CreateUserClientAsync();
        var tag = Id(await CreateTagAsync(client, "gone"));
        await DataAsync(client, "mutation($id: ID!) { deleteTag(id: $id) }", new { id = tag });

        var root = await PostAsync(client, CreateActivityMutation, new { input = ActivityInput(tagIds: [tag]) });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
    }

    [Test]
    public async Task FilterByPeriodTypeTagAndBicycle()
    {
        var client = await CreateUserClientAsync();
        var race = Id(await CreateTagAsync(client, "race"));
        var bike = Id(await CreateVehicleAsync(client));
        var today = DateTime.UtcNow.Date;
        var match = Id(await CreateActivityAsync(client, ActivityInput(date: today.AddDays(-1), vehicleId: bike, tagIds: [race])));
        await CreateActivityAsync(client, ActivityInput(date: today.AddDays(-1), type: "INDOOR", vehicleId: bike, tagIds: [race]));
        await CreateActivityAsync(client, ActivityInput(date: today.AddDays(-40), vehicleId: bike, tagIds: [race]));
        await CreateActivityAsync(client, ActivityInput(date: today.AddDays(-1), tagIds: [race]));
        await CreateActivityAsync(client, ActivityInput(date: today.AddDays(-1), vehicleId: bike));

        var where = new
        {
            date = new { gte = today.AddDays(-7) },
            type = new { neq = "INDOOR" },
            vehicle = new { id = new { eq = bike } },
            tags = new { some = new { id = new { eq = race } } },
        };
        var found = Nodes(await DataAsync(client, ActivitiesQuery, new { where }), "activities");

        await Assert.That(Ids(found)).IsEquivalentTo(new[] { match });
    }

    [Test]
    public async Task ListIsNewestFirstAndPagesWithoutSkippingOrRepeating()
    {
        var client = await CreateUserClientAsync();
        var sameDay = DateTime.UtcNow.Date.AddDays(-1);
        var older = Id(await CreateActivityAsync(client, ActivityInput(date: sameDay.AddDays(-1))));
        foreach (var _ in Enumerable.Range(0, 3))
            await CreateActivityAsync(client, ActivityInput(date: sameDay));

        const string page = """
            query($after: String) {
              activities(first: 2, after: $after) { nodes { id } pageInfo { hasNextPage endCursor } }
            }
            """;
        var first = (await DataAsync(client, page)).GetProperty("activities");
        var cursor = first.GetProperty("pageInfo").GetProperty("endCursor").GetString();
        var second = (await DataAsync(client, page, new { after = cursor })).GetProperty("activities");
        var ids = Ids(first.GetProperty("nodes").EnumerateArray().Concat(second.GetProperty("nodes").EnumerateArray()));

        await Assert.That(ids.Distinct().Count()).IsEqualTo(4);
        await Assert.That(ids[^1]).IsEqualTo(older);
        await Assert.That(second.GetProperty("pageInfo").GetProperty("hasNextPage").GetBoolean()).IsFalse();
    }
}
