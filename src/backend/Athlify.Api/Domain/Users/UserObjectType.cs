using HotChocolate;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Domain.Users;

/// <summary>The GraphQL <c>Role</c>; the stored string is mapped in <see cref="GraphQlRoleMapping"/>.</summary>
[GraphQLName("Role")]
public enum GraphQlRole
{
    User,
    Admin,
}

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
        // Server-side auth state; hidden so no RefreshToken type is inferred through this navigation.
        descriptor.Ignore(x => x.RefreshTokens);

        // Overrides the string property's field under the same name, "role".
        descriptor.Field(x => x.Role)
            .Type<NonNullType<EnumType<GraphQlRole>>>()
            .Resolve(context => GraphQlRoleMapping.ToGraphQlRole(context.Parent<User>().Role));
    }
}
