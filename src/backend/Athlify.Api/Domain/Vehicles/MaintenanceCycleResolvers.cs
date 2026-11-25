using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Gadgets;
using GreenDonut.Data;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Vehicles;

[MutationType]
public sealed partial class MaintenanceCycleMutation(MaintenanceCycleValidation maintenanceCycleValidation, MaintenanceCycleNode maintenanceCycleNode)
{
    public async Task<MaintenanceCycle> CreateMaintenanceCycle(
        MaintenanceCycleInput maintenanceCycle,
        QueryContext<MaintenanceCycle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        maintenanceCycleValidation.ThrowIfInvalid(maintenanceCycle);
        var created = new MaintenanceCycle();
        await ApplyAsync(created, maintenanceCycle, db, cancellationToken);
        db.MaintenanceCycles.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return (await maintenanceCycleNode.GetAsync(created.Id, query, db, cancellationToken))!;
    }

    public async Task<MaintenanceCycle?> UpdateMaintenanceCycle(
        [ID<MaintenanceCycle>] int id,
        MaintenanceCycleInput maintenanceCycle,
        QueryContext<MaintenanceCycle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        maintenanceCycleValidation.ThrowIfInvalid(maintenanceCycle);
        var existing = await db.MaintenanceCycles.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        await ApplyAsync(existing, maintenanceCycle, db, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return await maintenanceCycleNode.GetAsync(id, query, db, cancellationToken);
    }

    [ID<MaintenanceCycle>]
    public async Task<int?> DeleteMaintenanceCycle(
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

    private static async Task ApplyAsync(
        MaintenanceCycle target,
        MaintenanceCycleInput input,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var vehicle = await Links.LoadOptionalAsync(db.Vehicles, input.VehicleId, "Bicycle", cancellationToken);
        var gadget = await Links.LoadOptionalAsync(db.Gadgets, input.GadgetId, "Gadget", cancellationToken);

        target.Vehicle = vehicle;
        target.VehicleId = vehicle?.Id;
        target.Gadget = gadget;
        target.GadgetId = gadget?.Id;
        target.Name = input.Name.Trim();
        target.IntervalDistance = input.IntervalDistance;
        target.IntervalDays = input.IntervalDays;
        target.LastServiceDate = input.LastServiceDate;
        target.Description = Text.OrNull(input.Description);
    }
}

public sealed class MaintenanceCycleNode
{
    public Task<MaintenanceCycle?> GetAsync(
        [ID<MaintenanceCycle>] int id,
        QueryContext<MaintenanceCycle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.MaintenanceCycles, id, query, cancellationToken);
}
