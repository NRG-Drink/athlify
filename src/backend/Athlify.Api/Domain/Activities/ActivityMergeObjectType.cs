using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Activities;

/// <summary>The GraphQL shape of <see cref="ActivityMerge"/>: a Relay node without the internal fields.</summary>
[ObjectType<ActivityMerge>]
public static partial class ActivityMergeObjectType
{
    static partial void Configure(IObjectTypeDescriptor<ActivityMerge> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(ActivityMergeNode).GetMethod(nameof(ActivityMergeNode.GetAsync))!);
        descriptor.Ignore(x => x.UserId);
    }
}
