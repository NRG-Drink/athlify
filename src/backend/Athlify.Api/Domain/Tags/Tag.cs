using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Events;
using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Vehicles;

namespace Athlify.Api.Domain.Tags;

/// <summary>A label defined per user and shared by activities, bicycles, gadgets and Events.</summary>
public class Tag : Entity, IOwned
{
    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Upper-case <see cref="Name"/>; its unique index makes names unique per user, ignoring case.</summary>
    public string NormalizedName { get; set; } = string.Empty;

    // Inverse sides of the n:m links; only used to remove the links when a tag is deleted.
    public ICollection<Activity> Activities { get; set; } = [];

    public ICollection<Vehicle> Vehicles { get; set; } = [];

    public ICollection<Gadget> Gadgets { get; set; } = [];

    public ICollection<Event> Events { get; set; } = [];

    public static string Normalize(string name) => name.Trim().ToUpperInvariant();
}

/// <summary>Client input for a <see cref="Tag"/>.</summary>
public record TagInput
{
    public string Name { get; set; } = string.Empty;
}
