using Athlify.Api.Domain.Users;

namespace Athlify.Api.Tests;

public class UserRoleMappingTests
{
    [Test]
    public async Task MapsTheStoredRolesToTheGraphQlEnum()
    {
        await Assert.That(GraphQlRoleMapping.ToGraphQlRole(UserRole.User)).IsEqualTo(GraphQlRole.User);
        await Assert.That(GraphQlRoleMapping.ToGraphQlRole(UserRole.Admin)).IsEqualTo(GraphQlRole.Admin);
    }

    [Test]
    public async Task ThrowsForAnUnknownStoredRole()
    {
        await Assert.That(() => GraphQlRoleMapping.ToGraphQlRole("Owner")).Throws<InvalidOperationException>();
    }
}
