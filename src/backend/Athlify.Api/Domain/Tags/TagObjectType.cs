using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Tags;

/// <summary>The GraphQL shape of <see cref="Tag"/>: a Relay node without the internal fields.</summary>
[ObjectType<Tag>]
public static partial class TagObjectType
{
    static partial void Configure(IObjectTypeDescriptor<Tag> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(TagNode).GetMethod(nameof(TagNode.GetAsync))!);
        descriptor.Ignore(x => x.UserId);
        descriptor.Ignore(x => x.NormalizedName);
        descriptor.Ignore(x => x.Activities);
        descriptor.Ignore(x => x.Vehicles);
        descriptor.Ignore(x => x.Gadgets);
        descriptor.Ignore(x => x.Events);
    }
}
