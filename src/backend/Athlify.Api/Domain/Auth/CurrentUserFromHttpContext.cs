using Athlify.Api.Domain.Users;

namespace Athlify.Api.Domain.Auth;

public class CurrentUserFromHttpContext(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public int? UserId
    {
        get
        {
            var userIdClaim = httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) 
                ? userId 
                : throw new InvalidOperationException("User is not authenticated.");
        }
    }
}
