using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Vehicles;

/// <summary>The GraphQL shape of <see cref="Vehicle"/>: a Relay node without the internal fields.</summary>
[ObjectType<Vehicle>]
public static partial class VehicleObjectType
{
    static partial void Configure(IObjectTypeDescriptor<Vehicle> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(VehicleNode).GetMethod(nameof(VehicleNode.GetAsync))!);
        descriptor.Ignore(x => x.UserId);
        descriptor.Ignore(x => x.Activities);
    }
}
