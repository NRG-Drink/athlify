using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Users;

/// <summary>The GraphQL shape of <see cref="User"/>: a Relay node without the internal fields.</summary>
[ObjectType<User>]
public static partial class UserObjectType
{
    static partial void Configure(IObjectTypeDescriptor<User> descriptor)
    {
        descriptor.ImplementsNode()
            .IdField(x => x.Id)
            .ResolveNodeWith(typeof(UserNode).GetMethod(nameof(UserNode.GetAsync))!);
        descriptor.Ignore(x => x.PasswordHash);
    }
}
