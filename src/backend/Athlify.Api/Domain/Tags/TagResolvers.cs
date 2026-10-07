using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Tags;

[QueryType]
public static partial class TagQuery
{
    private static readonly Func<SortDefinition<Tag>, SortDefinition<Tag>> DefaultOrder =
        sort => sort.AddAscending(t => t.Name).AddAscending(t => t.Id);

    /// <summary>The user's tags, alphabetically.</summary>
    [UseFiltering]
    [UseSorting]
    public static async Task<PageConnection<Tag>> GetTags(
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
public static partial class TagMutation
{
    public const int MaxNameLength = 50;

    public static async Task<Tag> CreateTag(
        TagDto tag,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        await ThrowIfInvalidAsync(tag, null, db, cancellationToken);

        var created = new Tag { Name = tag.Name.Trim(), NormalizedName = Tag.Normalize(tag.Name) };
        db.Tags.Add(created);
        await SaveAsync(db, cancellationToken);
        return created;
    }

    public static async Task<Tag?> UpdateTag(
        [ID<Tag>] int id,
        TagDto tag,
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

    /// <summary>Deletes the tag and its links; the tagged records remain.</summary>
    [ID<Tag>]
    public static async Task<int?> DeleteTag(
        [ID<Tag>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        // Soft-deleted activities keep their links, so they are loaded too.
        var existing = await db.Tags
            .IgnoreQueryFilters([AthlifyDbContext.NotDeletedFilter])
            .Include(t => t.Activities)
            .Include(t => t.Vehicles)
            .Include(t => t.Gadgets)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        existing.Activities.Clear();
        existing.Vehicles.Clear();
        existing.Gadgets.Clear();
        db.Tags.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);
        return id;
    }

    private static async Task ThrowIfInvalidAsync(TagDto tag, int? id, AthlifyDbContext db, CancellationToken cancellationToken)
    {
        var errors = new ValidationErrors();
        errors.Text(tag.Name, "Name", MaxNameLength, required: true);
        errors.ThrowIfAny();

        var normalized = Tag.Normalize(tag.Name);
        if (await db.Tags.AnyAsync(t => t.NormalizedName == normalized && t.Id != id, cancellationToken))
        {
            throw DomainErrors.Validation("A tag with this name already exists.");
        }
    }

    /// <summary>The unique index catches a duplicate that a concurrent request saved after the check.</summary>
    private static async Task SaveAsync(AthlifyDbContext db, CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            throw DomainErrors.Validation("A tag with this name already exists.");
        }
    }
}

public static class TagNode
{
    public static async Task<Tag?> GetAsync([ID<Tag>] int id, AthlifyDbContext db, CancellationToken cancellationToken) =>
        await db.Tags.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
}
