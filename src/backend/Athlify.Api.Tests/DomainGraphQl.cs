using System.Text.Json;
using static Athlify.Api.Tests.GraphQl;

namespace Athlify.Api.Tests;

/// <summary>GraphQL documents and helpers for tags, bicycles and activities.</summary>
public static class DomainGraphQl
{
    public const string TagFields = "id name createdAt modifiedAt";

    public const string VehicleFields = """
        id brand model nickname purchaseDate description deactivationDate price source stravaGearId
        tags { id name }
        """;

    public const string ActivityFields = """
        id date type time distance averageSpeed elevationGain tss description
        heartRateMin heartRateMax heartRateAverage mood effort wind source stravaActivityId
        createdAt modifiedAt
        vehicle { id brand tags { id name } }
        gadgets { id model }
        tags { id name }
        """;

    public static async Task<JsonElement> CreateTagAsync(HttpClient client, string name) =>
        (await DataAsync(client, $$"""
            mutation($input: TagDtoInput!) { createTag(tag: $input) { {{TagFields}} } }
            """, new { input = new { name } })).GetProperty("createTag");

    public static object VehicleInput(
        string brand = "Canyon",
        string model = "Ultimate",
        string? purchaseDate = null,
        string? deactivationDate = null,
        decimal? price = null,
        params string[] tagIds) => new
        {
            brand,
            model,
            nickname = (string?)null,
            purchaseDate,
            description = (string?)null,
            deactivationDate,
            price,
            tagIds,
        };

    public static readonly string CreateVehicleMutation = $$"""
        mutation($input: VehicleDtoInput!) { createVehicle(vehicle: $input) { {{VehicleFields}} } }
        """;

    public static readonly string UpdateVehicleMutation = $$"""
        mutation($id: ID!, $input: VehicleDtoInput!) { updateVehicle(id: $id, vehicle: $input) { {{VehicleFields}} } }
        """;

    public const string DeleteVehicleMutation = "mutation($id: ID!) { deleteVehicle(id: $id) }";

    public static async Task<JsonElement> CreateVehicleAsync(HttpClient client, object? input = null) =>
        (await DataAsync(client, CreateVehicleMutation, new { input = input ?? VehicleInput() })).GetProperty("createVehicle");

    public static object ActivityInput(
        DateTime? date = null,
        string type = "ROAD",
        int time = 3600,
        double distance = 30,
        double? elevationGain = null,
        int? heartRateMin = null,
        int? heartRateMax = null,
        int? heartRateAverage = null,
        int? effort = null,
        string? mood = null,
        string? wind = null,
        string? vehicleId = null,
        string[]? gadgetIds = null,
        params string[] tagIds) => new
        {
            date = date ?? DateTime.UtcNow.AddHours(-2),
            type,
            time,
            distance,
            elevationGain,
            description = (string?)null,
            heartRateMin,
            heartRateMax,
            heartRateAverage,
            mood,
            effort,
            wind,
            vehicleId,
            gadgetIds = gadgetIds ?? [],
            tagIds,
        };

    public static readonly string CreateActivityMutation = $$"""
        mutation($input: ActivityDtoInput!) { createActivity(activity: $input) { {{ActivityFields}} } }
        """;

    public static readonly string UpdateActivityMutation = $$"""
        mutation($id: ID!, $input: ActivityDtoInput!) { updateActivity(id: $id, activity: $input) { {{ActivityFields}} } }
        """;

    public const string DeleteActivityMutation = "mutation($id: ID!) { deleteActivity(id: $id) }";

    public static readonly string ActivitiesQuery = $$"""
        query($where: ActivityFilterInput) { activities(first: 200, where: $where) { nodes { {{ActivityFields}} } } }
        """;

    public static readonly string ActivityNodeQuery = $$"""
        query($id: ID!) { node(id: $id) { ... on Activity { {{ActivityFields}} } } }
        """;

    public static async Task<JsonElement> CreateActivityAsync(HttpClient client, object? input = null) =>
        (await DataAsync(client, CreateActivityMutation, new { input = input ?? ActivityInput() })).GetProperty("createActivity");

    public const string GadgetFields = """
        id brand model nickname purchaseDate description deactivationDate price source
        tags { id name } vehicles { id model } maintenanceCycles { id name }
        """;

    public static object GadgetInput(
        string brand = "Garmin",
        string model = "Edge 840",
        decimal? price = null,
        string[]? vehicleIds = null,
        params string[] tagIds) => new
        {
            brand,
            model,
            nickname = (string?)null,
            purchaseDate = (string?)null,
            description = (string?)null,
            deactivationDate = (string?)null,
            price,
            tagIds,
            vehicleIds = vehicleIds ?? [],
        };

    public static readonly string CreateGadgetMutation = $$"""
        mutation($input: GadgetDtoInput!) { createGadget(gadget: $input) { {{GadgetFields}} } }
        """;

    public static readonly string UpdateGadgetMutation = $$"""
        mutation($id: ID!, $input: GadgetDtoInput!) { updateGadget(id: $id, gadget: $input) { {{GadgetFields}} } }
        """;

    public const string DeleteGadgetMutation = "mutation($id: ID!) { deleteGadget(id: $id) }";

    public static async Task<JsonElement> CreateGadgetAsync(HttpClient client, object? input = null) =>
        (await DataAsync(client, CreateGadgetMutation, new { input = input ?? GadgetInput() })).GetProperty("createGadget");

    public const string CycleFields = "id name intervalDistance intervalDays lastServiceDate description vehicle { id } gadget { id }";

    public static object CycleInput(
        string? vehicleId = null,
        string? gadgetId = null,
        string name = "Chain",
        double? intervalDistance = 3000,
        int? intervalDays = null) => new
        {
            vehicleId,
            gadgetId,
            name,
            intervalDistance,
            intervalDays,
            lastServiceDate = "2026-09-01",
            description = (string?)null,
        };

    public static readonly string CreateCycleMutation = $$"""
        mutation($input: MaintenanceCycleDtoInput!) { createMaintenanceCycle(maintenanceCycle: $input) { {{CycleFields}} } }
        """;

    public static readonly string UpdateCycleMutation = $$"""
        mutation($id: ID!, $input: MaintenanceCycleDtoInput!) { updateMaintenanceCycle(id: $id, maintenanceCycle: $input) { {{CycleFields}} } }
        """;

    public static readonly string CycleNodeQuery = $$"""
        query($id: ID!) { node(id: $id) { ... on MaintenanceCycle { {{CycleFields}} } } }
        """;

    public static async Task<JsonElement> CreateCycleAsync(HttpClient client, object input) =>
        (await DataAsync(client, CreateCycleMutation, new { input })).GetProperty("createMaintenanceCycle");

    public static string Id(JsonElement element) => element.GetProperty("id").GetString()!;

    public static IReadOnlyList<string> Ids(IEnumerable<JsonElement> elements) => elements.Select(Id).ToList();

    public static IReadOnlyList<string> TagNames(JsonElement element) =>
        element.GetProperty("tags").EnumerateArray().Select(t => t.GetProperty("name").GetString()!).ToList();
}
