using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Gadgets;
using GreenDonut.Data;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Vehicles;

/// <summary>A maintenance schedule of exactly one bicycle or one gadget.</summary>
[Node(NodeResolverType = typeof(MaintenanceCycleNode), NodeResolver = nameof(MaintenanceCycleNode.GetAsync))]
public class MaintenanceCycle : Entity, IOwned
{
    /// <summary>The owner of the bicycle or gadget; stored so the owner filter works like everywhere else.</summary>
    [GraphQLIgnore]
    public int UserId { get; set; }

    [GraphQLIgnore]
    public int? VehicleId { get; set; }

    public Vehicle? Vehicle { get; set; }

    [GraphQLIgnore]
    public int? GadgetId { get; set; }

    public Gadget? Gadget { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Kilometers between two services.</summary>
    public double? IntervalDistance { get; set; }

    /// <summary>Days between two services.</summary>
    public int? IntervalDays { get; set; }

    public DateOnly? LastServiceDate { get; set; }
    public string? Description { get; set; }
}

/// <summary>Client input for a <see cref="MaintenanceCycle"/>; exactly one of the two parents is set.</summary>
public record MaintenanceCycleDto
{
    [ID<Vehicle>]
    public int? VehicleId { get; set; }

    [ID<Gadget>]
    public int? GadgetId { get; set; }

    public string Name { get; set; } = string.Empty;
    public double? IntervalDistance { get; set; }
    public int? IntervalDays { get; set; }
    public DateOnly? LastServiceDate { get; set; }
    public string? Description { get; set; }
}

[MutationType]
public static partial class MaintenanceCycleMutation
{
    public const int MaxNameLength = 100;
    public const int MaxDescriptionLength = 2000;

    public static async Task<MaintenanceCycle> CreateMaintenanceCycle(
        MaintenanceCycleDto maintenanceCycle,
        QueryContext<MaintenanceCycle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        ThrowIfInvalid(maintenanceCycle);
        var created = new MaintenanceCycle();
        await ApplyAsync(created, maintenanceCycle, db, cancellationToken);
        db.MaintenanceCycles.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return (await MaintenanceCycleNode.GetAsync(created.Id, query, db, cancellationToken))!;
    }

    public static async Task<MaintenanceCycle?> UpdateMaintenanceCycle(
        [ID<MaintenanceCycle>] int id,
        MaintenanceCycleDto maintenanceCycle,
        QueryContext<MaintenanceCycle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        ThrowIfInvalid(maintenanceCycle);
        var existing = await db.MaintenanceCycles.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        await ApplyAsync(existing, maintenanceCycle, db, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return await MaintenanceCycleNode.GetAsync(id, query, db, cancellationToken);
    }

    [ID<MaintenanceCycle>]
    public static async Task<int?> DeleteMaintenanceCycle(
        [ID<MaintenanceCycle>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var existing = await db.MaintenanceCycles.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        db.MaintenanceCycles.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);
        return id;
    }

    private static void ThrowIfInvalid(MaintenanceCycleDto dto)
    {
        var errors = new ValidationErrors();
        errors.AddIf((dto.VehicleId is null) == (dto.GadgetId is null),
            "A maintenance cycle belongs to exactly one bicycle or one gadget.");
        errors.Text(dto.Name, "Name", MaxNameLength, required: true);
        errors.Text(dto.Description, "Description", MaxDescriptionLength, required: false);
        errors.AddIf(dto.IntervalDistance is null && dto.IntervalDays is null,
            "Set an interval in kilometers or in days.");
        errors.AddIf(dto.IntervalDistance <= 0, "The distance interval must be greater than 0.");
        errors.AddIf(dto.IntervalDays <= 0, "The day interval must be greater than 0.");
        errors.ThrowIfAny();
    }

    private static async Task ApplyAsync(
        MaintenanceCycle target,
        MaintenanceCycleDto dto,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var vehicle = await Links.LoadOptionalAsync(db.Vehicles, dto.VehicleId, "Bicycle", cancellationToken);
        var gadget = await Links.LoadOptionalAsync(db.Gadgets, dto.GadgetId, "Gadget", cancellationToken);

        target.Vehicle = vehicle;
        target.VehicleId = vehicle?.Id;
        target.Gadget = gadget;
        target.GadgetId = gadget?.Id;
        target.Name = dto.Name.Trim();
        target.IntervalDistance = dto.IntervalDistance;
        target.IntervalDays = dto.IntervalDays;
        target.LastServiceDate = dto.LastServiceDate;
        target.Description = Text.OrNull(dto.Description);
    }
}

public static class MaintenanceCycleNode
{
    public static Task<MaintenanceCycle?> GetAsync(
        [ID<MaintenanceCycle>] int id,
        QueryContext<MaintenanceCycle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.MaintenanceCycles, id, query, cancellationToken);
}
