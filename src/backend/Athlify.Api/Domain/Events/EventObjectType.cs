using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Events;

/// <summary>The GraphQL shape of <see cref="Event"/>: a Relay node without the internal fields.</summary>
[ObjectType<Event>]
public static partial class EventObjectType
{
    static partial void Configure(IObjectTypeDescriptor<Event> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(EventNode).GetMethod(nameof(EventNode.GetAsync))!);
        descriptor.Ignore(x => x.UserId);
    }
}
