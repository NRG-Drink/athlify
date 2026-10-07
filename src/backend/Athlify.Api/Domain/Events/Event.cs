using Athlify.Api.Database;
using Athlify.Api.Domain.Common;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using HotChocolate.Types.Relay;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Events;

public enum EventType
{
    Crash,
    Injury,
    Illness,
    Repair,
    Break,
    Goal,
    Other,
}

/// <summary>
/// A personal, dated record such as a crash, an injury or a goal. Events are not linked to activities; the
/// Dashboard timeline relates them by date.
/// </summary>
[Node(NodeResolverType = typeof(EventNode), NodeResolver = nameof(EventNode.GetAsync))]
public class Event : Entity, IOwned
{
    [GraphQLIgnore]
    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public EventType Type { get; set; }
    public string? Description { get; set; }
    public DateOnly StartDate { get; set; }

    /// <summary>Empty for a single-day Event.</summary>
    public DateOnly? EndDate { get; set; }

    public ICollection<Tag> Tags { get; set; } = [];
}

/// <summary>Client input for an <see cref="Event"/>; <c>tagIds</c> is the complete set of tags.</summary>
public record EventInput
{
    public string Name { get; set; } = string.Empty;
    public EventType Type { get; set; }
    public string? Description { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    [ID<Tag>]
    public IReadOnlyList<int> TagIds { get; set; } = [];
}

[QueryType]
public static partial class EventQuery
{
    private static readonly Func<SortDefinition<Event>, SortDefinition<Event>> DefaultOrder =
        sort => sort.AddDescending(e => e.StartDate).AddDescending(e => e.Id);

    /// <summary>The user's Events, latest start first.</summary>
    [UseFiltering]
    [UseSorting]
    public static async Task<PageConnection<Event>> GetEvents(
        PagingArguments pagingArgs,
        QueryContext<Event> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var page = await db.Events
            .With(query.Include(e => e.Id), DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        return new PageConnection<Event>(page);
    }
}

[MutationType]
public static partial class EventMutation
{
    public static async Task<Event> CreateEvent(
        EventInput @event,
        QueryContext<Event> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        EventValidation.ThrowIfInvalid(@event);
        var created = new Event();
        await ApplyAsync(created, @event, db, cancellationToken);
        db.Events.Add(created);
        await db.SaveChangesAsync(cancellationToken);
        return (await EventNode.GetAsync(created.Id, query, db, cancellationToken))!;
    }

    public static async Task<Event?> UpdateEvent(
        [ID<Event>] int id,
        EventInput @event,
        QueryContext<Event> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        EventValidation.ThrowIfInvalid(@event);
        var existing = await db.Events.Include(e => e.Tags).FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        await ApplyAsync(existing, @event, db, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return await EventNode.GetAsync(id, query, db, cancellationToken);
    }

    /// <summary>Deletes the Event and its tag links; the tags remain.</summary>
    [ID<Event>]
    public static async Task<int?> DeleteEvent(
        [ID<Event>] int id,
        AthlifyDbContext db,
        CancellationToken cancellationToken)
    {
        var existing = await db.Events.Include(e => e.Tags).FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        existing.Tags.Clear();
        db.Events.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);
        return id;
    }

    private static async Task ApplyAsync(Event target, EventInput dto, AthlifyDbContext db, CancellationToken cancellationToken)
    {
        var tags = await Links.LoadAllAsync(db.Tags, dto.TagIds, "Tag", cancellationToken);

        target.Name = dto.Name.Trim();
        target.Type = dto.Type;
        target.Description = Text.OrNull(dto.Description);
        target.StartDate = dto.StartDate;
        target.EndDate = dto.EndDate;
        Links.ReplaceWith(target.Tags, tags);
    }
}

public static class EventNode
{
    public static Task<Event?> GetAsync(
        [ID<Event>] int id,
        QueryContext<Event> query,
        AthlifyDbContext db,
        CancellationToken cancellationToken) =>
        Projection.FirstOrDefaultAsync(db.Events, id, query, cancellationToken);
}
