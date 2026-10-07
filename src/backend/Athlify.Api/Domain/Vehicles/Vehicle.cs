using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Tags;

namespace Athlify.Api.Domain.Vehicles;

/// <summary>A bicycle in the Garage.</summary>
public class Vehicle : Equipment
{
    /// <summary>External Strava gear id; set only by the Strava synchronization.</summary>
    public string? StravaGearId { get; set; }

    public ICollection<Tag> Tags { get; set; } = [];

    /// <summary>Gadgets mounted on this bicycle; edited from the gadget.</summary>
    public ICollection<Gadget> Gadgets { get; set; } = [];

    public ICollection<MaintenanceCycle> MaintenanceCycles { get; set; } = [];

    // Only used to clear the bicycle on its activities when it is deleted.
    public ICollection<Activity> Activities { get; set; } = [];
}

/// <summary>Client input for a <see cref="Vehicle"/>; the fields are those every piece of equipment has.</summary>
public record VehicleInput : EquipmentInput;
