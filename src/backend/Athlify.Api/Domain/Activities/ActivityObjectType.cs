using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Activities;

/// <summary>The GraphQL shape of <see cref="Activity"/>: a Relay node without the internal fields.</summary>
[ObjectType<Activity>]
public static partial class ActivityObjectType
{
    static partial void Configure(IObjectTypeDescriptor<Activity> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(ActivityNode).GetMethod(nameof(ActivityNode.GetAsync))!);
        descriptor.Ignore(x => x.UserId);
        descriptor.Ignore(x => x.DeletedAt);
        descriptor.Ignore(x => x.VehicleId);
        descriptor.Ignore(x => x.MergeId);
    }
}
