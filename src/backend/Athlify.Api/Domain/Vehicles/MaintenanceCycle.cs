using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Gadgets;

namespace Athlify.Api.Domain.Vehicles;

/// <summary>A maintenance schedule of exactly one bicycle or one gadget.</summary>
public class MaintenanceCycle : Entity, IOwned
{
    /// <summary>The owner of the bicycle or gadget; stored so the owner filter works like everywhere else.</summary>
    public int UserId { get; set; }

    public int? VehicleId { get; set; }

    public Vehicle? Vehicle { get; set; }

    public int? GadgetId { get; set; }

    public Gadget? Gadget { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Kilometers between two services.</summary>
    public double? IntervalDistance { get; set; }

    /// <summary>Days between two services.</summary>
    public int? IntervalDays { get; set; }

    public DateOnly? LastServiceDate { get; set; }
    public string? Description { get; set; }
}
