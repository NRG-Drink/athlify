using Athlify.Api.Domain.Common;
using static Athlify.Api.Tests.DomainGraphQl;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

public class VehicleTests : WebApiTestBase
{
    private const string VehiclesQuery = "query { vehicles { nodes { id brand model } } }";

    [Test]
    public async Task CreateUpdateAndDeleteRoundTrip()
    {
        var client = await CreateUserClientAsync();
        var race = Id(await CreateTagAsync(client, "race"));

        var created = await CreateVehicleAsync(client, VehicleInput(
            brand: "Canyon", model: "Grail", purchaseDate: "2024-03-01", price: 2499.90m, tagIds: [race]));
        var updated = (await DataAsync(client, UpdateVehicleMutation, new
        {
            id = Id(created),
            input = VehicleInput(brand: "Canyon", model: "Grail CF", purchaseDate: "2024-03-01", deactivationDate: "2026-01-31"),
        })).GetProperty("updateVehicle");
        var deleted = (await DataAsync(client, DeleteVehicleMutation, new { id = Id(created) })).GetProperty("deleteVehicle");

        await Assert.That(created.GetProperty("purchaseDate").GetString()).IsEqualTo("2024-03-01");
        await Assert.That(created.GetProperty("price").GetDecimal()).IsEqualTo(2499.90m);
        await Assert.That(created.GetProperty("source").GetString()).IsEqualTo("MANUAL");
        await Assert.That(TagNames(created)).IsEquivalentTo(new[] { "race" });
        await Assert.That(updated.GetProperty("model").GetString()).IsEqualTo("Grail CF");
        await Assert.That(updated.GetProperty("deactivationDate").GetString()).IsEqualTo("2026-01-31");
        await Assert.That(TagNames(updated)).IsEmpty();
        await Assert.That(deleted.GetString()).IsEqualTo(Id(created));
        await Assert.That(Nodes(await DataAsync(client, VehiclesQuery), "vehicles").Count).IsEqualTo(0);
    }

    [Test]
    [Arguments("", "Grail", null, null, null)]
    [Arguments("Canyon", " ", null, null, null)]
    [Arguments("Canyon", "Grail", null, null, -1.0)]
    [Arguments("Canyon", "Grail", "2025-05-01", "2025-04-30", null)]
    public async Task InvalidValuesAreRejected(
        string brand, string model, string? purchaseDate, string? deactivationDate, double? price)
    {
        var client = await CreateUserClientAsync();

        var root = await PostAsync(client, CreateVehicleMutation, new
        {
            input = VehicleInput(brand, model, purchaseDate, deactivationDate, (decimal?)price),
        });

        await Assert.That(ErrorCodes(root)).Contains(DomainErrors.ValidationCode);
        await Assert.That(Nodes(await DataAsync(client, VehiclesQuery), "vehicles").Count).IsEqualTo(0);
    }

    [Test]
    public async Task DeleteClearsTheBicycleOnActivitiesIncludingSoftDeletedOnes()
    {
        var client = await CreateUserClientAsync();
        var vehicle = Id(await CreateVehicleAsync(client));
        var active = Id(await CreateActivityAsync(client, ActivityInput(vehicleId: vehicle)));
        var softDeleted = Id(await CreateActivityAsync(client, ActivityInput(vehicleId: vehicle)));
        await DataAsync(client, DeleteActivityMutation, new { id = softDeleted });

        var deleted = (await DataAsync(client, DeleteVehicleMutation, new { id = vehicle })).GetProperty("deleteVehicle");

        var activity = (await DataAsync(client, ActivityNodeQuery, new { id = active })).GetProperty("node");
        await Assert.That(deleted.GetString()).IsEqualTo(vehicle);
        await Assert.That(IsNull(activity.GetProperty("vehicle"))).IsTrue();
        await Assert.That(Nodes(await DataAsync(client, ActivitiesQuery), "activities").Count).IsEqualTo(1);
    }

    [Test]
    public async Task ListIsOrderedByBrandAndModel()
    {
        var client = await CreateUserClientAsync();
        await CreateVehicleAsync(client, VehicleInput("Specialized", "Tarmac"));
        await CreateVehicleAsync(client, VehicleInput("Canyon", "Ultimate"));
        await CreateVehicleAsync(client, VehicleInput("Canyon", "Grail"));

        var models = Nodes(await DataAsync(client, VehiclesQuery), "vehicles").Select(v => v.GetProperty("model").GetString()!).ToList();

        await Assert.That(models).IsEquivalentTo(new[] { "Grail", "Ultimate", "Tarmac" }, TUnit.Assertions.Enums.CollectionOrdering.Matching);
    }
}
