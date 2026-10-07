using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Vehicles;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Gadgets;

[QueryType]
public static partial class GadgetQuery
{
    private static readonly Func<SortDefinition<Gadget>, SortDefinition<Gadget>> DefaultOrder =
        sort => sort.AddAscending(g => g.Brand).AddAscending(g => g.Model).AddAscending(g => g.Id);

    [UseFiltering]
    [UseSorting]
    public static async Task<PageConnection<Gadget>> GetGadgets(
        PagingArguments pagingArgs,
        QueryContext<Gadget> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var page = await db.Gadgets
            .With(query.Include(g => g.Id), DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        return new PageConnection<Gadget>(page);
    }
}

[MutationType]
public static partial class GadgetMutation
{
    public static async Task<Gadget> CreateGadget(
        GadgetDto gadget,
        QueryContext<Gadget> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        ThrowIfInvalid(gadget);
        var created = new Gadget();
        await ApplyAsync(created, gadget, db, cancellationToken);
        db.Gadgets.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return (await GadgetNode.GetAsync(created.Id, query, db, cancellationToken))!;
    }

    public static async Task<Gadget?> UpdateGadget(
        [ID<Gadget>] int id,
        GadgetDto gadget,
        QueryContext<Gadget> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        ThrowIfInvalid(gadget);
        var existing = await db.Gadgets
            .Include(g => g.Tags)
            .Include(g => g.Vehicles)
            .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        await ApplyAsync(existing, gadget, db, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return await GadgetNode.GetAsync(id, query, db, cancellationToken);
    }

    /// <summary>
    /// Deletes the gadget with its maintenance cycles. Its links to activities (soft-deleted ones included),
    /// bicycles and tags are removed; those records remain.
    /// </summary>
    [ID<Gadget>]
    public static async Task<int?> DeleteGadget(
        [ID<Gadget>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var existing = await db.Gadgets
            .IgnoreQueryFilters([AthlifyDbContext.NotDeletedFilter])
            .Include(g => g.Tags)
            .Include(g => g.Vehicles)
            .Include(g => g.Activities)
            .Include(g => g.MaintenanceCycles)
            .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        existing.Tags.Clear();
        existing.Vehicles.Clear();
        existing.Activities.Clear();
        db.MaintenanceCycles.RemoveRange(existing.MaintenanceCycles);
        db.Gadgets.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);
        return id;
    }

    private static void ThrowIfInvalid(GadgetDto dto)
    {
        var errors = new ValidationErrors();
        EquipmentValidation.Validate(errors, dto.Brand, dto.Model, dto.Nickname, dto.Description,
            dto.PurchaseDate, dto.DeactivationDate, dto.Price);
        errors.ThrowIfAny();
    }

    private static async Task ApplyAsync(Gadget target, GadgetDto dto, AthlifyDbContext db, CancellationToken cancellationToken)
    {
        var tags = await Links.LoadAllAsync(db.Tags, dto.TagIds, "Tag", cancellationToken);
        var vehicles = await Links.LoadAllAsync(db.Vehicles, dto.VehicleIds, "Bicycle", cancellationToken);

        target.Brand = dto.Brand.Trim();
        target.Model = dto.Model.Trim();
        target.Nickname = Text.OrNull(dto.Nickname);
        target.PurchaseDate = dto.PurchaseDate;
        target.Description = Text.OrNull(dto.Description);
        target.DeactivationDate = dto.DeactivationDate;
        target.Price = dto.Price;
        Links.ReplaceWith(target.Tags, tags);
        Links.ReplaceWith(target.Vehicles, vehicles);
    }
}

public static class GadgetNode
{
    public static Task<Gadget?> GetAsync(
        [ID<Gadget>] int id,
        QueryContext<Gadget> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.Gadgets, id, query, cancellationToken);
}
