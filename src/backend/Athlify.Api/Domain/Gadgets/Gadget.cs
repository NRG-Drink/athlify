using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Vehicles;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Gadgets;

/// <summary>Additional equipment such as a bike computer or a heart-rate monitor.</summary>
[Node(NodeResolverType = typeof(GadgetNode), NodeResolver = nameof(GadgetNode.GetAsync))]
public class Gadget : Equipment
{
    public ICollection<Tag> Tags { get; set; } = [];

    /// <summary>The bicycles this gadget is mounted on.</summary>
    public ICollection<Vehicle> Vehicles { get; set; } = [];

    public ICollection<MaintenanceCycle> MaintenanceCycles { get; set; } = [];

    // Only used to remove the links when the gadget is deleted.
    [GraphQLIgnore]
    public ICollection<Activity> Activities { get; set; } = [];
}

/// <summary>
/// Client input for a <see cref="Gadget"/>. <c>tagIds</c> and <c>vehicleIds</c> are complete sets; the link
/// between gadgets and bicycles is edited from the gadget.
/// </summary>
public record GadgetInput : EquipmentInput
{
    [ID<Vehicle>]
    public IReadOnlyList<int> VehicleIds { get; set; } = [];
}
