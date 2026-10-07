using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Vehicles;

/// <summary>The GraphQL shape of <see cref="MaintenanceCycle"/>: a Relay node without the internal fields.</summary>
[ObjectType<MaintenanceCycle>]
public static partial class MaintenanceCycleObjectType
{
    static partial void Configure(IObjectTypeDescriptor<MaintenanceCycle> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(MaintenanceCycleNode).GetMethod(nameof(MaintenanceCycleNode.GetAsync))!);
        descriptor.Ignore(x => x.UserId);
        descriptor.Ignore(x => x.VehicleId);
        descriptor.Ignore(x => x.GadgetId);
    }
}
