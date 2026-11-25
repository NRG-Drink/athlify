using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Gadgets;

[QueryType]
public sealed partial class GadgetQuery
{
    private static readonly Func<SortDefinition<Gadget>, SortDefinition<Gadget>> DefaultOrder =
        sort => sort.AddAscending(g => g.Brand).AddAscending(g => g.Model).AddAscending(g => g.Id);

    [UseFiltering]
    [UseSorting]
    public async Task<PageConnection<Gadget>> GetGadgets(
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
public sealed partial class GadgetMutation(EquipmentValidation equipmentValidation, GadgetNode gadgetNode)
{
    public async Task<Gadget> CreateGadget(
        GadgetInput gadget,
        QueryContext<Gadget> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        equipmentValidation.ThrowIfInvalid(gadget);
        var created = new Gadget();
        await ApplyAsync(created, gadget, db, cancellationToken);
        db.Gadgets.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return (await gadgetNode.GetAsync(created.Id, query, db, cancellationToken))!;
    }

    public async Task<Gadget?> UpdateGadget(
        [ID<Gadget>] int id,
        GadgetInput gadget,
        QueryContext<Gadget> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        equipmentValidation.ThrowIfInvalid(gadget);
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
        return await gadgetNode.GetAsync(id, query, db, cancellationToken);
    }

    [ID<Gadget>]
    public async Task<int?> DeleteGadget(
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

    private async Task ApplyAsync(Gadget target, GadgetInput input, AthlifyDbContext db, CancellationToken cancellationToken)
    {
        var tags = await Links.LoadAllAsync(db.Tags, input.TagIds, "Tag", cancellationToken);
        var vehicles = await Links.LoadAllAsync(db.Vehicles, input.VehicleIds, "Bicycle", cancellationToken);

        equipmentValidation.Apply(target, input);
        Links.ReplaceWith(target.Tags, tags);
        Links.ReplaceWith(target.Vehicles, vehicles);
    }
}

public sealed class GadgetNode
{
    public Task<Gadget?> GetAsync(
        [ID<Gadget>] int id,
        QueryContext<Gadget> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.Gadgets, id, query, cancellationToken);
}
