using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Body;

/// <summary>The GraphQL shape of <see cref="BodyStats"/>: a Relay node without the internal fields.</summary>
[ObjectType<BodyStats>]
public static partial class BodyStatsObjectType
{
    static partial void Configure(IObjectTypeDescriptor<BodyStats> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(BodyStatsNode).GetMethod(nameof(BodyStatsNode.GetAsync))!);
        descriptor.Ignore(x => x.UserId);
    }
}
