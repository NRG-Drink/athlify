using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Athlify.Api.Domain.Tags;

[QueryType]
public sealed partial class TagQuery
{
    private static readonly Func<SortDefinition<Tag>, SortDefinition<Tag>> DefaultOrder =
        sort => sort.AddAscending(t => t.Name).AddAscending(t => t.Id);

    [UseFiltering]
    [UseSorting]
    public async Task<PageConnection<Tag>> GetTags(
        PagingArguments pagingArgs,
        QueryContext<Tag> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var page = await db.Tags
            .With(query.Include(t => t.Id), DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        return new PageConnection<Tag>(page);
    }
}

[MutationType]
public sealed partial class TagMutation(TagValidation tagValidation)
{
    public async Task<Tag> CreateTag(
        TagInput tag,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        await ThrowIfInvalidAsync(tag, null, db, cancellationToken);

        var created = new Tag { Name = tag.Name.Trim(), NormalizedName = Tag.Normalize(tag.Name) };
        db.Tags.Add(created);
        await SaveAsync(db, cancellationToken);
        return created;
    }

    public async Task<Tag?> UpdateTag(
        [ID<Tag>] int id,
        TagInput tag,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var existing = await db.Tags.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        await ThrowIfInvalidAsync(tag, id, db, cancellationToken);
        existing.Name = tag.Name.Trim();
        existing.NormalizedName = Tag.Normalize(tag.Name);
        await SaveAsync(db, cancellationToken);
        return existing;
    }

    [ID<Tag>]
    public async Task<int?> DeleteTag(
        [ID<Tag>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var existing = await db.Tags
            .IgnoreQueryFilters([AthlifyDbContext.NotDeletedFilter])
            .Include(t => t.Activities)
            .Include(t => t.Vehicles)
            .Include(t => t.Gadgets)
            .Include(t => t.Events)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        existing.Activities.Clear();
        existing.Vehicles.Clear();
        existing.Gadgets.Clear();
        existing.Events.Clear();
        db.Tags.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);
        return id;
    }

    private async Task ThrowIfInvalidAsync(TagInput tag, int? id, AthlifyDbContext db, CancellationToken cancellationToken)
    {
        tagValidation.ThrowIfInvalid(tag);

        var normalized = Tag.Normalize(tag.Name);
        if (await db.Tags.AnyAsync(t => t.NormalizedName == normalized && t.Id != id, cancellationToken))
        {
            throw DomainErrors.Validation("A tag with this name already exists.");
        }
    }

    private async Task SaveAsync(AthlifyDbContext db, CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: "23505" })
        {
            throw DomainErrors.Validation("A tag with this name already exists.");
        }
    }
}

public sealed class TagNode
{
    public async Task<Tag?> GetAsync([ID<Tag>] int id, AthlifyDbContext db, CancellationToken cancellationToken) =>
        await db.Tags.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
}
