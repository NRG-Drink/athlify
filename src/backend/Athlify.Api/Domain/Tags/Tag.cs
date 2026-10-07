using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Events;
using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Vehicles;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Tags;

/// <summary>A label defined per user and shared by activities, bicycles, gadgets and Events.</summary>
[Node(NodeResolverType = typeof(TagNode), NodeResolver = nameof(TagNode.GetAsync))]
public class Tag : Entity, IOwned
{
    [GraphQLIgnore]
    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Upper-case <see cref="Name"/>; its unique index makes names unique per user, ignoring case.</summary>
    [GraphQLIgnore]
    public string NormalizedName { get; set; } = string.Empty;

    // Inverse sides of the n:m links; only used to remove the links when a tag is deleted.
    [GraphQLIgnore]
    public ICollection<Activity> Activities { get; set; } = [];

    [GraphQLIgnore]
    public ICollection<Vehicle> Vehicles { get; set; } = [];

    [GraphQLIgnore]
    public ICollection<Gadget> Gadgets { get; set; } = [];

    [GraphQLIgnore]
    public ICollection<Event> Events { get; set; } = [];

    public static string Normalize(string name) => name.Trim().ToUpperInvariant();
}

/// <summary>Client input for a <see cref="Tag"/>.</summary>
public record TagDto
{
    public string Name { get; set; } = string.Empty;
}
