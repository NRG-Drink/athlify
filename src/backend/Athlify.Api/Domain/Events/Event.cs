using Athlify.Api.Domain.Common;

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
public class Event : Entity, IOwned
{
    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;
    public EventType Type { get; set; }
    public string? Description { get; set; }
    public DateOnly StartDate { get; set; }

    /// <summary>Empty for a single-day Event.</summary>
    public DateOnly? EndDate { get; set; }

    public ICollection<Tag> Tags { get; set; } = [];
}
