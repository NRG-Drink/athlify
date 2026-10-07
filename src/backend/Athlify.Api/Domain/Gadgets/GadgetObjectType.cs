using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Gadgets;

/// <summary>The GraphQL shape of <see cref="Gadget"/>: a Relay node without the internal fields.</summary>
[ObjectType<Gadget>]
public static partial class GadgetObjectType
{
    static partial void Configure(IObjectTypeDescriptor<Gadget> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(GadgetNode).GetMethod(nameof(GadgetNode.GetAsync))!);
        descriptor.Ignore(x => x.UserId);
        descriptor.Ignore(x => x.Activities);
    }
}
