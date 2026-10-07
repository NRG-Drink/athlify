using Athlify.Api.Domain.Gadgets;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Vehicles;

/// <summary>Client input for a <see cref="MaintenanceCycle"/>; exactly one of the two parents is set.</summary>
public record MaintenanceCycleInput
{
    [ID<Vehicle>]
    public int? VehicleId { get; set; }

    [ID<Gadget>]
    public int? GadgetId { get; set; }

    public string Name { get; set; } = string.Empty;
    public double? IntervalDistance { get; set; }
    public int? IntervalDays { get; set; }
    public DateOnly? LastServiceDate { get; set; }
    public string? Description { get; set; }
}
