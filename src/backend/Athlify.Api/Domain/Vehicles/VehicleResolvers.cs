using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Vehicles;

[QueryType]
public static partial class VehicleQuery
{
    // Brand and model are never null, which keeps the keyset cursor simple; the id breaks ties.
    private static readonly Func<SortDefinition<Vehicle>, SortDefinition<Vehicle>> DefaultOrder =
        sort => sort.AddAscending(v => v.Brand).AddAscending(v => v.Model).AddAscending(v => v.Id);

    [UseFiltering]
    [UseSorting]
    public static async Task<PageConnection<Vehicle>> GetVehicles(
        PagingArguments pagingArgs,
        QueryContext<Vehicle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var page = await db.Vehicles
            .With(query.Include(v => v.Id), DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        return new PageConnection<Vehicle>(page);
    }
}

[MutationType]
public static partial class VehicleMutation
{
    public static async Task<Vehicle> CreateVehicle(
        VehicleDto vehicle,
        QueryContext<Vehicle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        ThrowIfInvalid(vehicle);
        var created = new Vehicle();
        await ApplyAsync(created, vehicle, db, cancellationToken);
        db.Vehicles.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return (await VehicleNode.GetAsync(created.Id, query, db, cancellationToken))!;
    }

    public static async Task<Vehicle?> UpdateVehicle(
        [ID<Vehicle>] int id,
        VehicleDto vehicle,
        QueryContext<Vehicle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        ThrowIfInvalid(vehicle);
        var existing = await db.Vehicles.Include(v => v.Tags).FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        await ApplyAsync(existing, vehicle, db, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return await VehicleNode.GetAsync(id, query, db, cancellationToken);
    }

    /// <summary>
    /// Deletes the bicycle. Its activities remain without a bicycle, soft-deleted ones included, because they
    /// still reference it; its tag links are removed.
    /// </summary>
    [ID<Vehicle>]
    public static async Task<int?> DeleteVehicle(
        [ID<Vehicle>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var existing = await db.Vehicles
            .IgnoreQueryFilters([AthlifyDbContext.NotDeletedFilter])
            .Include(v => v.Tags)
            .Include(v => v.Activities)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        foreach (var activity in existing.Activities)
        {
            activity.VehicleId = null;
        }

        existing.Tags.Clear();
        db.Vehicles.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);
        return id;
    }

    private static void ThrowIfInvalid(VehicleDto dto)
    {
        var errors = new ValidationErrors();
        EquipmentValidation.Validate(errors, dto.Brand, dto.Model, dto.Nickname, dto.Description,
            dto.PurchaseDate, dto.DeactivationDate, dto.Price);
        errors.ThrowIfAny();
    }

    private static async Task ApplyAsync(Vehicle target, VehicleDto dto, AthlifyDbContext db, CancellationToken cancellationToken)
    {
        var tags = await Links.LoadAllAsync(db.Tags, dto.TagIds, "Tag", cancellationToken);

        target.Brand = dto.Brand.Trim();
        target.Model = dto.Model.Trim();
        target.Nickname = Text.OrNull(dto.Nickname);
        target.PurchaseDate = dto.PurchaseDate;
        target.Description = Text.OrNull(dto.Description);
        target.DeactivationDate = dto.DeactivationDate;
        target.Price = dto.Price;
        Links.ReplaceWith(target.Tags, tags);
    }
}

public static class VehicleNode
{
    public static Task<Vehicle?> GetAsync(
        [ID<Vehicle>] int id,
        QueryContext<Vehicle> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.Vehicles, id, query, cancellationToken);
}
