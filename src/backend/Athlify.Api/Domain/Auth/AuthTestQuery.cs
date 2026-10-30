using Athlify.Api.Domain.Users;
using HotChocolate.Authorization;
using System.Security.Claims;

namespace Athlify.Api.Domain.Auth;

// TODO: Remove this query in production.
[QueryType]
public partial class AuthTestQuery
{
    public record HelloData(string Hello, DateTime Timestamp);

    [AllowAnonymous]
    public async Task<HelloData> HelloWorld()
    {
        return new HelloData("Hello World!", DateTime.UtcNow);
    }

    [Authorize]
    public async Task<HelloData> HelloUser(ClaimsPrincipal claimsPrincipal)
    {
        var userName = claimsPrincipal.FindFirstValue(ClaimTypes.Name);
        return new HelloData($"Hello user {userName}!", DateTime.UtcNow);
    }

    [Authorize(Roles = [UserRole.Admin])]
    public async Task<HelloData> HelloAdmin(ClaimsPrincipal claimsPrincipal)
    {
        var userName = claimsPrincipal.FindFirstValue(ClaimTypes.Name);
        return new HelloData($"Hello admin {userName}!", DateTime.UtcNow);
    }

    [Authorize(Roles = [UserRole.User])]
    public async Task<HelloData> HelloStaff(ClaimsPrincipal claimsPrincipal)
    {
        var userName = claimsPrincipal.FindFirstValue(ClaimTypes.Name);
        return new HelloData($"Hello staff {userName}!", DateTime.UtcNow);
    }

    [Authorize(Roles = [UserRole.User, UserRole.Admin])]
    public async Task<HelloData> HelloEmployee(ClaimsPrincipal claimsPrincipal)
    {
        var userName = claimsPrincipal.FindFirstValue(ClaimTypes.Name);
        return new HelloData($"Hello employee {userName}!", DateTime.UtcNow);
    }
}
