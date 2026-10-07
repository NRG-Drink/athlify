using Athlify.Api.Domain.Common;
using static Athlify.Api.Tests.DomainGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class GadgetTests : WebApiTestBase
{
    private const string GadgetsQuery = "query { gadgets { nodes { id model } } }";

    [Test]
    public async Task CreateUpdateAndDeleteWithBicycleLinks()
    {
        var client = await CreateUserClientAsync();
        var road = Id(await CreateVehicleAsync(client, VehicleInput(model: "Ultimate")));
        var gravel = Id(await CreateVehicleAsync(client, VehicleInput(model: "Grail")));
        var tag = Id(await CreateTagAsync(client, "electronics"));

        var created = await CreateGadgetAsync(client, GadgetInput(price: 449m, vehicleIds: [road, gravel], tagIds: [tag]));
        var updated = (await DataAsync(client, UpdateGadgetMutation, new
        {
            id = Id(created),
            input = GadgetInput(model: "Edge 1050", vehicleIds: [gravel]),
        })).GetProperty("updateGadget");
        var bike = (await DataAsync(client, "query($id: ID!) { node(id: $id) { ... on Vehicle { gadgets { id } } } }", new { id = gravel }))
            .GetProperty("node");

        await Assert.That(created.GetProperty("price").GetDecimal()).IsEqualTo(449m);
        await Assert.That(Ids(created.GetProperty("vehicles").EnumerateArray())).IsEquivalentTo(new[] { road, gravel });
        await Assert.That(TagNames(created)).IsEquivalentTo(new[] { "electronics" });
        await Assert.That(updated.GetProperty("model").GetString()).IsEqualTo("Edge 1050");
        await Assert.That(Ids(updated.GetProperty("vehicles").EnumerateArray())).IsEquivalentTo(new[] { gravel });
        await Assert.That(TagNames(updated)).IsEmpty();
        await Assert.That(Ids(bike.GetProperty("gadgets").EnumerateArray())).IsEquivalentTo(new[] { Id(created) });

        var deleted = (await DataAsync(client, DeleteGadgetMutation, new { id = Id(created) })).GetProperty("deleteGadget");
        await Assert.That(deleted.GetString()).IsEqualTo(Id(created));
        await Assert.That(Nodes(await DataAsync(client, GadgetsQuery), "gadgets").Count).IsEqualTo(0);
    }

    [Test]
    public async Task InvalidValuesAreRejected()
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, CreateGadgetMutation, new { input = GadgetInput(brand: " ", price: -5m) });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        await Assert.That(Nodes(await DataAsync(client, GadgetsQuery), "gadgets").Count).IsEqualTo(0);
    }

    [Test]
    public async Task ActivitiesUseGadgetsAndDeletingAGadgetUnlinksThem()
    {
        var client = await CreateUserClientAsync();
        var gadget = Id(await CreateGadgetAsync(client));
        var active = Id(await CreateActivityAsync(client, ActivityInput(gadgetIds: [gadget])));
        var softDeleted = Id(await CreateActivityAsync(client, ActivityInput(gadgetIds: [gadget])));
        var bike = Id(await CreateVehicleAsync(client));
        await DataAsync(client, UpdateGadgetMutation, new { id = gadget, input = GadgetInput(vehicleIds: [bike]) });
        await DataAsync(client, DeleteActivityMutation, new { id = softDeleted });

        var before = (await DataAsync(client, ActivityNodeQuery, new { id = active })).GetProperty("node");
        await DataAsync(client, DeleteGadgetMutation, new { id = gadget });
        var after = (await DataAsync(client, ActivityNodeQuery, new { id = active })).GetProperty("node");
        var bikeAfter = (await DataAsync(client, "query($id: ID!) { node(id: $id) { ... on Vehicle { gadgets { id } } } }", new { id = bike }))
            .GetProperty("node");

        await Assert.That(Ids(before.GetProperty("gadgets").EnumerateArray())).IsEquivalentTo(new[] { gadget });
        await Assert.That(after.GetProperty("gadgets").GetArrayLength()).IsEqualTo(0);
        await Assert.That(bikeAfter.GetProperty("gadgets").GetArrayLength()).IsEqualTo(0);
    }

    [Test]
    public async Task ForeignGadgetOrBicycleCannotBeLinked()
    {
        var luca = await CreateUserClientAsync();
        var mia = await CreateUserClientAsync("mia@example.com");
        var lucasGadget = Id(await CreateGadgetAsync(luca));
        var lucasBike = Id(await CreateVehicleAsync(luca));

        var activity = await PostAsync(mia, CreateActivityMutation, new { input = ActivityInput(gadgetIds: [lucasGadget]) });
        var gadget = await PostAsync(mia, CreateGadgetMutation, new { input = GadgetInput(vehicleIds: [lucasBike]) });
        var node = (await DataAsync(mia, "query($id: ID!) { node(id: $id) { id } }", new { id = lucasGadget })).GetProperty("node");

        await Assert.That(ErrorCodes(activity)).Contains(DomainErrors.ValidationCode);
        await Assert.That(ErrorCodes(gadget)).Contains(DomainErrors.ValidationCode);
        await Assert.That(IsNull(node)).IsTrue();
    }
}

public class MaintenanceCycleTests : WebApiTestBase
{
    [Test]
    public async Task CycleBelongsToABicycleOrAGadget()
    {
        var client = await CreateUserClientAsync();
        var bike = Id(await CreateVehicleAsync(client));
        var gadget = Id(await CreateGadgetAsync(client));

        var forBike = await CreateCycleAsync(client, CycleInput(vehicleId: bike));
        var forGadget = await CreateCycleAsync(client, CycleInput(gadgetId: gadget, name: "Battery", intervalDistance: null, intervalDays: 365));
        var moved = (await DataAsync(client, UpdateCycleMutation, new
        {
            id = Id(forBike),
            input = CycleInput(gadgetId: gadget, name: "Firmware", intervalDistance: null, intervalDays: 90),
        })).GetProperty("updateMaintenanceCycle");
        var garage = await DataAsync(client, """
            query { vehicles { nodes { maintenanceCycles { id } } } gadgets { nodes { maintenanceCycles { id name } } } }
            """);

        await Assert.That(Id(forBike.GetProperty("vehicle"))).IsEqualTo(bike);
        await Assert.That(IsNull(forBike.GetProperty("gadget"))).IsTrue();
        await Assert.That(forBike.GetProperty("lastServiceDate").GetString()).IsEqualTo("2026-09-01");
        await Assert.That(Id(forGadget.GetProperty("gadget"))).IsEqualTo(gadget);
        await Assert.That(IsNull(moved.GetProperty("vehicle"))).IsTrue();
        await Assert.That(Id(moved.GetProperty("gadget"))).IsEqualTo(gadget);
        await Assert.That(Nodes(garage, "vehicles").Single().GetProperty("maintenanceCycles").GetArrayLength()).IsEqualTo(0);
        await Assert.That(Nodes(garage, "gadgets").Single().GetProperty("maintenanceCycles").GetArrayLength()).IsEqualTo(2);
    }

    [Test]
    public async Task ExactlyOneParentAndAnIntervalAreRequired()
    {
        var client = await CreateUserClientAsync();
        var bike = Id(await CreateVehicleAsync(client));
        var gadget = Id(await CreateGadgetAsync(client));

        foreach (var input in new[]
                 {
                     CycleInput(),
                     CycleInput(vehicleId: bike, gadgetId: gadget),
                     CycleInput(vehicleId: bike, intervalDistance: null, intervalDays: null),
                     CycleInput(vehicleId: bike, intervalDistance: 0),
                     CycleInput(vehicleId: bike, name: " "),
                 })
        {
            var root = await PostAsync(client, CreateCycleMutation, new { input });
            await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        }
    }

    [Test]
    public async Task DeletingTheParentDeletesItsCycles()
    {
        var client = await CreateUserClientAsync();
        var bike = Id(await CreateVehicleAsync(client));
        var gadget = Id(await CreateGadgetAsync(client));
        var bikeCycle = Id(await CreateCycleAsync(client, CycleInput(vehicleId: bike)));
        var gadgetCycle = Id(await CreateCycleAsync(client, CycleInput(gadgetId: gadget)));

        await DataAsync(client, DeleteVehicleMutation, new { id = bike });
        await DataAsync(client, DeleteGadgetMutation, new { id = gadget });

        await Assert.That(IsNull((await DataAsync(client, CycleNodeQuery, new { id = bikeCycle })).GetProperty("node"))).IsTrue();
        await Assert.That(IsNull((await DataAsync(client, CycleNodeQuery, new { id = gadgetCycle })).GetProperty("node"))).IsTrue();
    }

    [Test]
    public async Task ForeignCycleOrParentBehavesAsMissing()
    {
        var luca = await CreateUserClientAsync();
        var mia = await CreateUserClientAsync("mia@example.com");
        var lucasBike = Id(await CreateVehicleAsync(luca));
        var cycle = Id(await CreateCycleAsync(luca, CycleInput(vehicleId: lucasBike)));

        var node = (await DataAsync(mia, CycleNodeQuery, new { id = cycle })).GetProperty("node");
        var update = (await DataAsync(mia, UpdateCycleMutation, new { id = cycle, input = CycleInput(vehicleId: lucasBike) }))
            .GetProperty("updateMaintenanceCycle");
        var delete = (await DataAsync(mia, "mutation($id: ID!) { deleteMaintenanceCycle(id: $id) }", new { id = cycle }))
            .GetProperty("deleteMaintenanceCycle");
        var onForeignBike = await PostAsync(mia, CreateCycleMutation, new { input = CycleInput(vehicleId: lucasBike) });

        await Assert.That(IsNull(node)).IsTrue();
        await Assert.That(IsNull(update)).IsTrue();
        await Assert.That(IsNull(delete)).IsTrue();
        await Assert.That(ErrorCodes(onForeignBike)).Contains(DomainErrors.ValidationCode);
        await Assert.That(IsNull((await DataAsync(luca, CycleNodeQuery, new { id = cycle })).GetProperty("node"))).IsFalse();
    }
}
