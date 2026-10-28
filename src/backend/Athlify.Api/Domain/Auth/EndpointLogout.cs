using Athlify.Api.Database;
using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Auth;

public class EndpointLogout
{
    public async Task<IResult> HandleLogout(
        HttpContext httpContext,
        [Service] ITokenService tokenService,
        [Service] ICookieService cookieService,
        [Service] IHashService hashService,
        [Service] AthlifyDbContext db)
    {
        try
        {
            var refreshToken = cookieService.GetRefreshTokenCookie(httpContext);
            if (refreshToken is not null)
            {
                var ip = cookieService.GetIpAddress(httpContext);
                var oldTokenHash = hashService.HashToken(refreshToken);
                var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == oldTokenHash);
                if (stored is not null)
                {
                    await tokenService.RevokeTokenFamily(stored.FamilyId, ip, RefreshToken.RevokeReason.Logout);
                }
            }

            cookieService.DeleteRefreshTokenCookie(httpContext);

            return Results.Ok();
        }
        catch (UnauthorizedAccessException)
        {
            return Results.Unauthorized();
        }
        catch (Exception)
        {
            var error = new Exception("An error occurred while processing the request.");
            return Results.InternalServerError(error);
        }
    }
}
