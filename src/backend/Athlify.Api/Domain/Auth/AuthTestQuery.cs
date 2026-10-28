using Athlify.Api.Domain.Users;
using HotChocolate.Authorization;
using System.Security.Claims;

namespace Athlify.Api.Domain.Auth;

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
        var userId = claimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);
        return new HelloData($"Hello user {userId}!", DateTime.UtcNow);
    }

    [Authorize(Roles = [UserRole.Admin])]
    public async Task<HelloData> HelloAdmin(ClaimsPrincipal claimsPrincipal)
    {
        var userId = claimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);
        return new HelloData($"Hello admin {userId}!", DateTime.UtcNow);
    }

    [Authorize(Roles = [UserRole.User])]
    public async Task<HelloData> HelloStaff(ClaimsPrincipal claimsPrincipal)
    {
        var userId = claimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);
        return new HelloData($"Hello staff {userId}!", DateTime.UtcNow);
    }

    [Authorize(Roles = [UserRole.User, UserRole.Admin])]
    public async Task<HelloData> HelloEmployee(ClaimsPrincipal claimsPrincipal)
    {
        var userId = claimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);
        return new HelloData($"Hello employee {userId}!", DateTime.UtcNow);
    }
}
