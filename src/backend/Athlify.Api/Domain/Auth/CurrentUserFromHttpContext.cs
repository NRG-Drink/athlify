using Athlify.Api.Domain.Users;
using System.Security.Claims;

namespace Athlify.Api.Domain.Auth;

public class CurrentUserFromHttpContext(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public int? UserId => GetUserIdFromHttpContext();

    private int? GetUserIdFromHttpContext()
    {
        var idString = httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(idString, out var idInt) 
            ? idInt 
            : null;
    }
}
