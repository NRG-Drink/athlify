namespace Athlify.Api.Domain.Users;

/// <summary>
/// Maps the stored role string to the GraphQL <see cref="GraphQlRole"/>. Lives outside
/// <see cref="UserObjectType"/> because public static members of an object type become schema fields.
/// </summary>
public static class GraphQlRoleMapping
{
    public static GraphQlRole ToGraphQlRole(string role) => role switch
    {
        UserRole.User => GraphQlRole.User,
        UserRole.Admin => GraphQlRole.Admin,
        _ => throw new InvalidOperationException($"Unknown user role '{role}'."),
    };
}
