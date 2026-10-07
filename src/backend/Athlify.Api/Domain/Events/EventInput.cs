using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Events;

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
